#!/usr/bin/env bun
/**
 * Orchestrate Charli.chat deploys.
 *
 * Flags
 *   --dry-run        print plan, exit
 *   --only <regex>   deploy subset
 *   --prod           use .env.defaults.prod (default: .env.defaults.dev)
 */

import { $, file }          from "bun";
import { basename, join }   from "path";
import { createHash }       from "node:crypto";
import { ethers }           from "ethers";
import { LitContracts }     from "@lit-protocol/contracts-sdk";
import toml                 from "toml";
import { createLogger }     from "./lib/logger.ts";

/*─────────────────── types ───────────────────*/
type EnvMap   = Record<string, string>;
type Target   = { type: "supabase" | "cf-worker" | "frontend"; path: string };
type CacheRec = { hash: string; cid: string };
type CacheMap = Record<string, CacheRec>;

/*─────────────────── constants / flags ───────────────────*/
const CACHE_FILE  = ".lit-actions-cache.json";
const DRY         = Bun.argv.includes("--dry-run");
const IS_PROD     = Bun.argv.includes("--prod");
const ONLY_RE     = (() => {
  const i = Bun.argv.indexOf("--only");
  return i > -1 ? new RegExp(Bun.argv[i + 1]) : null;
})();
const DEFAULTS_PATH = IS_PROD ? ".env.defaults.prod" : ".env.defaults.dev";

/*─────────────────── logger ───────────────────*/
const log = createLogger({ mode: IS_PROD ? "prod" : "dev", dryRun: DRY });

/*─────────────────── main ───────────────────*/
void (async function main(): Promise<void> {
  /* 1️⃣  load defaults ------------------------------------------------*/
  const defaults = await readEnv(DEFAULTS_PATH);
  Object.assign(process.env, defaults);

  /* 2️⃣  Lit Actions → Pinata  ---------------------------------------*/
  const { map: litEnv, changed: actionsChanged } = await pinLitActions("apps/LitActions");
  const cidList = Object.entries(litEnv)
    .filter(([k]) => k.startsWith("LIT_ACTION_CID_"))
    .map(([, v]) => v);

  /* 3️⃣  PKP logic ----------------------------------------------------*/
  if (haveCachedDevPKP(defaults)) {
    log(`› Re-using cached DEV PKP ${defaults.RELAYER_PKP_TOKEN_ID}`);
    if (actionsChanged) {
      await setupPkpPermissions(defaults.RELAYER_PKP_TOKEN_ID, cidList);
    }
  } else {
    const pkp = await mintRelayerPKP();
    await setupPkpPermissions(pkp.tokenId, cidList);
    if (IS_PROD) await burnPkp(pkp.tokenId);
    await updateEnvFile(DEFAULTS_PATH, {
      RELAYER_PKP_TOKEN_ID:                       pkp.tokenId,
      VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY: pkp.publicKey,
    });
    Object.assign(process.env, {
      RELAYER_PKP_TOKEN_ID:                       pkp.tokenId,
      VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY: pkp.publicKey,
    });
  }

  /* 4️⃣  gather targets ----------------------------------------------*/
  const targets = collectTargets().filter(t => !ONLY_RE || ONLY_RE.test(t.path));
  if (targets.length === 0) {
    log("❌ No targets matched --only filter"); return;
  }
  log("\n=== Deploy targets ===");
  targets.forEach((t, i) => log(`${i + 1}. ${t.type.padEnd(10)} — ${t.path}`));
  log("==============\n");
  if (DRY) return;

  /* 5️⃣  deploy in order ---------------------------------------------*/
  const unifiedEnv: EnvMap = { ...defaults, ...litEnv };
  for (const t of targets) {
    await injectSecrets(t, unifiedEnv);
    await runDeploy(t);
  }
})();

/*─────────────────── Lit Actions pinning ───────────────────*/
async function pinLitActions(dir: string): Promise<{ map: EnvMap; changed: boolean }> {
  log("› Pinning Lit Actions (CID v0) …");
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not set");

  /* load or create cache */
  const cache: CacheMap = (await file(CACHE_FILE).exists())
    ? JSON.parse(await file(CACHE_FILE).text()) as CacheMap
    : {};

  const files = (await $`bash -c 'ls ${dir}/*.ts'`.text()).trim().split("\n").filter(Boolean);
  const out: EnvMap = {};
  let changed = false;

  for (const path of files) {
    const name = basename(path).replace(/\.ts$/, "");
    const key  = `LIT_ACTION_CID_${name.toUpperCase()}`;

    const content = await file(path).arrayBuffer();
    const hash    = createHash("sha256").update(Buffer.from(content)).digest("hex");

    if (cache[path]?.hash === hash) {
      out[key] = cache[path].cid;
      continue;
    }

    /* pin */
    const body = new FormData();
    body.append("file", new Blob([content], { type: "text/typescript" }), `${name}.ts`);
    body.append("pinataMetadata", JSON.stringify({ name }));
    body.append("pinataOptions",  JSON.stringify({ cidVersion: 0 }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method:  "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body,
    });

    if (!res.ok) throw new Error(`Pinata ${res.status}: ${await res.text()}`);
    const { IpfsHash: cid } = (await res.json()) as { IpfsHash: string };
    log(`  • ${name} → ${cid}`);
    cache[path] = { hash, cid };
    out[key]    = cid;
    changed     = true;
  }

  await Bun.write(CACHE_FILE, JSON.stringify(cache, null, 2));
  return { map: out, changed };
}

/*─────────────────── PKP helpers ───────────────────*/
async function mintRelayerPKP(): Promise<{ tokenId: string; publicKey: string; ethAddress: string }> {
  const privateKey = process.env.RELAYER_MANAGER_PRIVATE_KEY;
  if (!privateKey) throw new Error("RELAYER_MANAGER_PRIVATE_KEY not set");

  const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
  const wallet   = new ethers.Wallet(privateKey, provider);

  const client = new LitContracts({ signer: wallet, network: (process.env.LIT_NETWORK as unknown) ?? "datil-dev" });
  await client.connect();

  const { pkp, tx } = await client.pkpNftContractUtils.write.mint();
  await tx.wait();
  log(`Minted PKP ${pkp.tokenId.toString()}`);
  return { tokenId: pkp.tokenId.toString(), publicKey: pkp.publicKey, ethAddress: pkp.ethAddress };
}

async function setupPkpPermissions(tokenId: string, cids: string[]): Promise<string[]> {
  const privateKey = process.env.RELAYER_MANAGER_PRIVATE_KEY;
  if (!privateKey) throw new Error("RELAYER_MANAGER_PRIVATE_KEY not set");

  const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
  const wallet   = new ethers.Wallet(privateKey, provider);
  const client   = new LitContracts({ signer: wallet, network: (process.env.LIT_NETWORK as unknown) ?? "datil-dev" });
  await client.connect();

  const added: string[] = [];
  for (const cid of cids) {
    const permitted = await client.pkpPermissionsContractUtils.read.isPermittedAction(tokenId, cid);
    if (permitted) continue;
    const tx = await client.pkpPermissionsContractUtils.write.addPermittedAction(tokenId, cid);
    await tx.wait();
    added.push(cid);
  }
  if (added.length) log(`› Added PKP permissions for ${added.length} new CID(s)`);
  return added;
}

async function burnPkp(tokenId: string): Promise<void> {
  const privateKey = process.env.RELAYER_MANAGER_PRIVATE_KEY!;
  const provider   = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
  const wallet     = new ethers.Wallet(privateKey, provider);
  const address    = process.env.PROD_PKP_NFT_CONTRACT_ADDRESS;
  if (!address) throw new Error("PROD_PKP_NFT_CONTRACT_ADDRESS missing");

  const abi   = ["function transferFrom(address from,address to,uint256 tokenId)"];
  const pkp   = new ethers.Contract(address, abi, wallet);
  const burn  = "0x0000000000000000000000000000000000000001";
  log(`› Burning PKP ${tokenId}`);
  const tx = await pkp.transferFrom(wallet.address, burn, tokenId);
  await tx.wait();
}

/*─────────────────── env helpers ───────────────────*/
async function readEnv(p: string): Promise<EnvMap> {
  if (!(await file(p).exists())) return {};
  return Object.fromEntries(
    (await file(p).text())
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => {
        const [k, ...v] = line.split("=");
        return [k.trim(), v.join("=").trim()];
      }),
  );
}

async function updateEnvFile(fp: string, kv: EnvMap): Promise<void> {
  const exists = await file(fp).exists();
  const lines  = exists ? (await file(fp).text()).split(/\r?\n/) : [];
  const map    = Object.fromEntries(lines.filter(Boolean).map(l => {
    const [k, ...v] = l.split("=");
    return [k.trim(), v.join("=").trim()];
  }));

  Object.assign(map, kv);
  const out = Object.entries(map).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  await Bun.write(fp, out);
}

/*─────────────────── deploy orchestration ───────────────────*/
function collectTargets(): Target[] {
  const supa = findDirs("apps/supabase/functions").map<Target>(p => ({ type: "supabase",  path: p }));
  const wrks = findDirs("apps/Cloudflare-Workers") .map<Target>(p => ({ type: "cf-worker", path: p }));
  const fe   = [{ type: "frontend", path: "apps/vite-frontend" } as const];
  return [...supa, ...wrks, ...fe];
}

function findDirs(root: string): string[] {
  const res = Bun.spawnSync(["bash", "-c", `find ${root} -maxdepth 1 -type d`]);
  return res.stdout.toString().trim().split("\n").filter(p => p && p !== root);
}

function haveCachedDevPKP(env: EnvMap): boolean {
  return !IS_PROD && env.RELAYER_PKP_TOKEN_ID && env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY;
}

/*─────────────────── secrets + deploy per target ───────────────────*/
async function injectSecrets(t: Target, env: EnvMap): Promise<void> {
  if (t.type === "cf-worker") {
    const name = basename(t.path);
    const { stdout } = await $`bunx wrangler secret list --name ${name} --format json`.quiet();
    const existing: Set<string> = new Set<string>((JSON.parse(stdout || "[]") as { name: string }[]).map(s => s.name));

    /* vars declared in local config */
    const declared = await localWorkerVars(t.path);
    const upload   = Object.entries(env)
      .filter(([k]) => /^[A-Z0-9_]+$/.test(k) && !declared.has(k) && !existing.has(k));

    if (!upload.length) { log(`ℹ️  ${name}: no new secrets`); return; }
    await $`echo ${JSON.stringify(Object.fromEntries(upload))} | bunx wrangler secret bulk --name ${name}`.quiet();
    return;
  }

  if (t.type === "supabase") {
    const kv = Object.entries(env).filter(([k]) => /^[A-Z0-9_]+$/.test(k));
    if (!kv.length) return;
    await $`supabase secrets set ${kv.map(([k, v]) => `${k}=${v}`).join(" ")}`.quiet();
  }
}

async function localWorkerVars(dir: string): Promise<Set<string>> {
  const cfgFiles = ["wrangler.toml", "wrangler.json", "wrangler.jsonc"];
  for (const cfg of cfgFiles) {
    const p = join(dir, cfg);
    if (await file(p).exists()) {
      const raw = await file(p).text();
      if (cfg.endsWith(".toml")) {
        return new Set(Object.keys((toml.parse(raw) as { vars?: EnvMap }).vars ?? {}));
      }
      const cleaned = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
      return new Set(Object.keys((JSON.parse(cleaned) as { vars?: EnvMap }).vars ?? {}));
    }
  }
  return new Set<string>();
}

async function runDeploy(t: Target): Promise<void> {
  if (t.type === "supabase") {
    const fn = basename(t.path);
    if (DRY) { log(`(dry) supabase functions deploy ${fn}`); return; }
    await $`supabase functions deploy ${fn} --project-ref onhlhmondvxwwiwnruvo --no-verify-jwt --workdir apps`.quiet();
    return;
  }

  if (t.type === "cf-worker") {
    const wranglerToml = join(t.path, "wrangler.toml");
    if (!(await file(wranglerToml).exists())) { log(`⏭️  ${t.path} (no wrangler.toml)`); return; }
    if (DRY) { log(`(dry) wrangler deploy ${t.path}`); return; }
    await $`bunx wrangler deploy --config ${wranglerToml}`.quiet();
    return;
  }

  if (t.type === "frontend") {
    if (DRY) { log(`(dry) vite-frontend ${IS_PROD ? "deploy" : "dev"} run`); return; }
    if (IS_PROD) await $`bun run deploy --cwd ${t.path}`.quiet();
    else         await $`node node_modules/.bin/vite`.cwd(t.path);
  }
}
