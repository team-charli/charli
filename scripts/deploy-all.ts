#!/usr/bin/env bun
/** Orchestrate deploys.
 *  Flags:
 *    --dry-run        print plan, exit
 *    --only <regex>   deploy subset
 *    --prod           use .env.defaults.prod (default: .env.defaults.dev)
 */
import { $, file } from "bun";
import { join, basename } from "path";
import { ethers } from "ethers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import toml from "toml";

const DRY      = Bun.argv.includes("--dry-run");
const ONLY_RE  = (() => { const i = Bun.argv.indexOf("--only"); return i > -1 ? new RegExp(Bun.argv[i+1]) : null;})();
const IS_PROD  = Bun.argv.includes("--prod");
type EnvMap    = Record<string,string>;

function log(m:string){ console.log(DRY?`(dry) ${m}`:m); }


/*
-- Deploy outline

- set envs
- Lit Actions
- setup-pkp-permissions
- deploy functions
- deploy workers
- deploy frontend
*/

(async function main(){
  // Load environment variables first
  const defaults = await loadDefaults(IS_PROD ? ".env.defaults.prod" : ".env.defaults.dev");

  // Apply environment variables to process.env
  Object.entries(defaults).forEach(([key, value]) => {
    process.env[key] = value;
  });

  const dynamic  = await pinLitActions("apps/LitActions");
  const targets  = collectTargets().filter(t => !ONLY_RE || ONLY_RE.test(t.path));

  log("\n=== Deploy targets ===");
  targets.forEach((t,i)=>log(`${i+1}. ${t.type.padEnd(11)} — ${t.path}`));
  log("==============\n");
  if (DRY) return;

  // Mint a new relayer PKP, set its permissions, and then burn it
  log("› Minting new relayer PKP and setting permissions");
  if (!DRY) {
    const pkpInfo = await mintRelayerPKP();
    log(`  • Minted new relayer PKP with token ID: ${pkpInfo.tokenId}`);
    log(`  • Public key: ${pkpInfo.publicKey}`);
    log(`  • Ethereum address: ${pkpInfo.ethAddress}`);

    // Set permissions for the PKP
    log("› Setting permissions for the new relayer PKP");
    await setupPkpPermissions(
      pkpInfo.tokenId,
      dynamic.LIT_ACTION_CID_PERMITACTION,
      dynamic.LIT_ACTION_CID_TRANSFERFROMACTION,
      dynamic.LIT_ACTION_CID_RELAYERACTION,
      dynamic.LIT_ACTION_CID_CHECKORRESETRELAYERNONCEACTION,
      dynamic.LIT_ACTION_CID_TRANSFERCONTROLLERTOTEACHERACTION
    );

    // Burn the PKP to make permissions immutable
    log("› Burning the relayer PKP to make permissions immutable");
    await burnPkp(pkpInfo.tokenId);

    // Update environment variables with the new PKP info
    log("› Updating environment variables with new PKP info");
    await updateEnvFile(
      IS_PROD ? ".env.defaults.prod" : ".env.defaults.dev",
      {
        RELAYER_PKP_TOKEN_ID: pkpInfo.tokenId,
        VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY: pkpInfo.publicKey
      }
    );

    // Apply the updated environment variables to the current process
    process.env.RELAYER_PKP_TOKEN_ID = pkpInfo.tokenId;
    process.env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY = pkpInfo.publicKey;
  }

  for (const t of targets){
    const env     = {...defaults,...dynamic};

    await injectSecrets(t,env);
    await runDeploy(t);
  }
})();










/*─────────────────── PKP MINTING HELPERS ───────────────────*/

/**
 * Mints a new Relayer PKP using the RELAYER_MANAGER_PRIVATE_KEY
 * @returns Information about the minted PKP (tokenId, publicKey, ethAddress)
 */
async function mintRelayerPKP() {
  const PROVIDER_URL = "https://yellowstone-rpc.litprotocol.com";
  const privateKey   = process.env.RELAYER_MANAGER_PRIVATE_KEY!;
  if (!privateKey) throw new Error("RELAYER_MANAGER_PRIVATE_KEY not set");

  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
  const wallet   = new ethers.Wallet(privateKey, provider);

  /* ── connect to Lit contracts ─────────────────────────────── */
  const contractClient = new LitContracts({
    signer : wallet,
    network: process.env.LIT_NETWORK as any || "datil-dev",
    debug  : false,
  });
  await contractClient.connect();

  /* ── mint! (helper already handles fee + keyType=2) ───────── */
  const { pkp, tx } = await contractClient.pkpNftContractUtils.write.mint();
  await tx.wait();

  log(`Mint transaction confirmed: ${tx.hash}`);

  return {
    tokenId   : pkp.tokenId.toString(),
    publicKey : pkp.publicKey,
    ethAddress: pkp.ethAddress,
  };
}

/**
 * Sets permissions for a PKP to execute specific Lit Actions
 */
async function setupPkpPermissions(
  tokenId: string,
  permitCid: string,
  transferFromCid: string,
  relayerCid: string,
  resetNonceCid: string,
  transferCtrlCid: string
) {
  const PROVIDER_URL = "https://yellowstone-rpc.litprotocol.com";
  const privateKey = process.env.RELAYER_MANAGER_PRIVATE_KEY!;

  if (!privateKey) {
    throw new Error("RELAYER_MANAGER_PRIVATE_KEY environment variable is not set");
  }

  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Connect to Lit Protocol contracts
  const contractClient = new LitContracts({
    signer: wallet,
    network: process.env.LIT_NETWORK as any || "datil-dev",
    debug: false,
  });
  await contractClient.connect();

  log("Setting PKP permissions for Lit Actions...");

  // Helper to add permission and verify it was set
  async function addAndVerify(cid: string, name: string) {
    log(`  • Adding permission for ${name} (${cid})`);
    await contractClient.pkpPermissionsContractUtils.write.addPermittedAction(tokenId, cid);
    const isPermitted = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(tokenId, cid);
    if (!isPermitted) {
      throw new Error(`Failed to set permission for ${name} (${cid})`);
    }
    return isPermitted;
  }

  // Add permissions for all Lit Actions
  const actions: [string, string][] = [
    [permitCid,        "permitAction"],
    [transferFromCid,  "transferFromAction"],
    [relayerCid,       "relayerAction"],
    [resetNonceCid,    "checkOrResetRelayerNonceAction"],
    [transferCtrlCid,  "transferControllerToTeacherAction"],
  ];

  const results: boolean[] = [];

  for (const [cid, name] of actions) {
    /*   1️⃣ send TX   */
    log(`  • Adding permission for ${name} (${cid})`);
    const tx = await contractClient.pkpPermissionsContractUtils.write
      .addPermittedAction(tokenId, cid);

    /*   2️⃣ wait so the nonce is mined before the next call   */
    await tx.wait();

    /*   3️⃣ verify   */
    const ok = await contractClient.pkpPermissionsContractUtils.read
      .isPermittedAction(tokenId, cid);
    if (!ok) throw new Error(`Failed to set permission for ${name} (${cid})`);

    results.push(ok);
  }
}

/**
 * Burns a PKP by transferring it to a dead address
 */
async function burnPkp(tokenId: string) {
  const PROVIDER_URL = "https://yellowstone-rpc.litprotocol.com";
  const privateKey = process.env.RELAYER_MANAGER_PRIVATE_KEY!;

  if (!privateKey) {
    throw new Error("RELAYER_MANAGER_PRIVATE_KEY environment variable is not set");
  }

  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Connect to the PKP NFT contract directly using ethers
  const env = process.env.ACTION_ENV || "dev";
  let pkpNftAddress;

  if (env === "dev") {
    pkpNftAddress = process.env.DEV_PKP_NFT_CONTRACT_ADDRESS;
  } else if (env === "test") {
    pkpNftAddress = process.env.TEST_PKP_NFT_CONTRACT_ADDRESS;
  } else {
    pkpNftAddress = process.env.PROD_PKP_NFT_CONTRACT_ADDRESS;
  }

  if (!pkpNftAddress) {
    throw new Error(`Missing PKP NFT contract address for environment: ${env}`);
  }

  // Basic ERC721 ABI for transferFrom
  const erc721Abi = ["function transferFrom(address from, address to, uint256 tokenId)"];
  const contract = new ethers.Contract(pkpNftAddress, erc721Abi, wallet);

  // Burn address (technically not 0x0, but a designated "dead" address)
  const burnAddress = "0x0000000000000000000000000000000000000001";

  // Transfer the PKP to the burn address
  log(`Burning PKP ${tokenId} by transferring to ${burnAddress}...`);
  const burnTx = await contract.transferFrom(wallet.address, burnAddress, tokenId, {
    gasLimit: 100000,
  });

  const receipt = await burnTx.wait();
  log(`Burn transaction confirmed: ${receipt.transactionHash}`);
  return receipt;
}

/**
 * Updates the environment file with new values
 */
async function updateEnvFile(filePath: string, newValues: Record<string, string>) {
  if (!(await file(filePath).exists())) {
    throw new Error(`Environment file ${filePath} does not exist`);
  }

  let content = await file(filePath).text();
  const lines = content.split(/\r?\n/);

  // Update or add each key-value pair
  for (const [key, value] of Object.entries(newValues)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      // Update existing key
      content = content.replace(regex, `${key}=${value}`);
    } else {
      // Add new key at the end
      content += `\n${key}=${value}`;
    }
  }

  // Write the updated content back to the file
  await file(filePath).write(content);
  log(`Updated environment file ${filePath} with new values`);
}

/*──────────────────────── HELPERS ─────────────────────────*/

/** Pin every `.ts` file in apps/LitActions with Pinata and
 *  return an env-map like { LIT_ACTION_CID_TRANSFERFROM: "bafy…" } */


/** Pin every .ts file under `dir` *as CID v0* and
 *  return something like:
 *    { LIT_ACTION_CID_TRANSFERFROMACTION: "Qm…" , … }
 */
async function pinLitActions(dir: string): Promise<EnvMap> {
  log("› Pinning Lit Actions via Pinata (CID v0)");

  const jwt = process.env.PINATA_JWT!;
  if (!jwt) throw new Error("PINATA_JWT not set");

  const out: EnvMap = {};

  // list *.ts files inside apps/LitActions
  const files = Bun.spawnSync(["bash", "-c", `ls ${dir}/*.ts`])
  .stdout.toString().trim().split("\n").filter(Boolean);

  for (const path of files) {
    const name   = basename(path).replace(/\.ts$/, "");       // e.g. transferFromAction
    const buffer = await file(path).arrayBuffer();

    /* Build the multipart body expected by
       POST /pinning/pinFileToIPFS                                   */
    const body   = new FormData();
    body.append("file", new Blob([buffer], { type: "text/typescript" }), `${name}.ts`);
    body.append("pinataMetadata", JSON.stringify({ name }));
    body.append("pinataOptions",  JSON.stringify({ cidVersion: 0 })); // ‼️ v0

    const res  = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method : "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body
    });

    if (!res.ok) {
      const msg = await res.text();
      log(`  ✖ failed to pin ${name}: ${msg}`);
      throw new Error(`Pinata error ${res.status}`);
    }

    const { IpfsHash } = await res.json();     // always v0 when cidVersion:0
    out[`LIT_ACTION_CID_${name.toUpperCase()}`] = IpfsHash;
    log(`  • ${name} → ${IpfsHash}`);          // Qm… hashes ✔
  }

  return out;
}

function collectTargets(){
  const supa = findDirs("apps/supabase/functions");
  const wkrs = findDirs("apps/Cloudflare-Workers");
  return [
    ...supa.map(p=>({type:"supabase",path:p})),
    ...wkrs.map(p=>({type:"cf-worker",path:p})),
    {type:"frontend",path:"apps/vite-frontend"},
  ];
}

async function loadDefaults(file:string){ return readEnv(file); }

async function readEnv(p:string):Promise<EnvMap>{
  if(!(await file(p).exists())) return {};
  const txt=await file(p).text();
  return Object.fromEntries(
    txt.split(/\r?\n/).filter(Boolean).map(l=>{
      const [k,...v]=l.split("="); return [k.trim(),v.join("=").trim()];
    }),
  );
}

/*──────────────────────── HELPERS ─────────────────────────*/

async function injectSecrets(
  t: { type: string; path: string },
  env: EnvMap,
) {
  /* ---------- Cloudflare Worker ---------- */
  if (t.type === "cf-worker") {
    const name = basename(t.path);

    /* 1️⃣ secrets that already exist on the remote worker ------------- */
    const { stdout } =
      await $`bunx wrangler secret list --name ${name} --format json`.quiet();
    const existingSecretNames = new Set(
      JSON.parse(stdout.toString()).map((k: any) => k.name),
    );

    /* 2️⃣ vars declared locally in wrangler.toml / .jsonc ------------- */
    let declaredVarNames = new Set<string>();
    for (const cfg of ["wrangler.toml", "wrangler.json", "wrangler.jsonc"]) {
      const p = join(t.path, cfg);
      if (await file(p).exists()) {
        const raw = await file(p).text();
        if (cfg.endsWith(".toml")) {
          declaredVarNames = new Set(Object.keys(toml.parse(raw).vars ?? {}));
        } else {
          // strip // and /* */ comments before JSON.parse
          const json = JSON.parse(raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ""));
          declaredVarNames = new Set(Object.keys(json.vars ?? {}));
        }
        break; // found the file we need
      }
    }

    /* 3️⃣ fail fast on any duplicate key ------------------------------ */
    const collisions = Object.keys(env).filter(
      (k) => declaredVarNames.has(k)       // fail only if it's a plain var
    );
    if (collisions.length) {
      log(`❌ ENV collision in ${name}: ${collisions.join(", ")}`);
      process.exit(1);            // stop the orchestrator immediately
    }

    /* 4️⃣ upload only brand-new keys ---------------------------------- */
    const freshOnly = Object.fromEntries(
      Object.entries(env).filter(([k]) => !collisions.includes(k)),
    );

    if (Object.keys(freshOnly).length === 0) {
      log(`ℹ️  all ${name} secrets already present – skipping`);
      return;
    }

    try {
      await $`echo ${JSON.stringify(freshOnly)} | bunx wrangler secret bulk --name ${name}`;
    } catch (err) {
      log(`⚠️  wrangler secret bulk failed for ${name}\n${(err as any).stderr ?? err}`);
    }
    return;
  }

  /* ---------- Supabase ---------- */
  if (t.type === "supabase") {
    const pairs = Object.entries(env).map(([k, v]) => `${k}=${v}`);
    await $`supabase secrets set ${pairs.join(" ")} \
--project-ref onhlhmondvxwwiwnruvo${DRY ? " --dry-run" : ""}`;
  }
}

/*──────────────────────── DEPLOY ─────────────────────────*/
async function runDeploy(t: { type: string; path: string }) {
  const fnName      = basename(t.path);
  const WORKDIR     = "apps";
  const PROJECT_REF = "onhlhmondvxwwiwnruvo";

  /* ---------- Supabase Edge Functions ---------- */
  if (t.type === "supabase") {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(fnName)) {
      log(`⏭️  skipping ${fnName} – not a deployable function folder`);
      return;
    }
    if (DRY) {
      log(`(dry) supabase functions deploy ${fnName}`);
      return;
    }
    await $`supabase functions deploy ${fnName} \
--project-ref ${PROJECT_REF} \
--no-verify-jwt \
--workdir ${WORKDIR}`;
    return;
  }

  /* ---------- Cloudflare Workers ---------- */
  if (t.type === "cf-worker") {
    const wranglerToml = join(t.path, "wrangler.toml");
    if (!(await file(wranglerToml).exists())) {
      log(`⏭️  ${basename(t.path)} – no wrangler.toml, nothing to deploy`);
      return;
    }

    /* guard against broken package.json -------------------------------- */
    const pkgJsonPath = join(t.path, "package.json");
    if (await file(pkgJsonPath).exists()) {
      try { JSON.parse(await file(pkgJsonPath).text()); }
      catch {
        log(`⚠️  ${basename(t.path)} – invalid package.json, skipping`);
        return;
      }
    }

    const cmd = $`bunx wrangler deploy --config ${wranglerToml}`;
    try {
      if (DRY) log(`(dry) ${cmd.command.join(" ")}`);
        else     await cmd;
    } catch (err) {
      /* Wrangler build errors: log & move on instead of crashing */
      if (err instanceof Error) {
        log(`⚠️  wrangler deploy failed for ${basename(t.path)} – skipping\n${err.stderr ?? err.message}`);
        return;
      }
      throw err;
    }
    return;
  }

  /* ---------- Front-end ---------- */
  if (t.path === "apps/vite-frontend") {
    if (DRY) {
      log(`(dry) vite-frontend ${IS_PROD ? "deploy" : "dev"} run`);
      return;
    }

    if (IS_PROD) {
      // production build + wrangler deploy (still fine under Bun)
      log("› Deploying vite-frontend to Cloudflare");
      await $`bun run deploy --cwd ${t.path}`;
    } else {
      // local dev server ⇢ run Vite inside real Node
      log("› Running vite-frontend in development mode (node)");
      await $`node node_modules/.bin/vite`.cwd(t.path);
    }
    return;
  }

  /* ---------- Generic package.json deploy script ---------- */
  const pkgJson = join(t.path, "package.json");
  if (
    (await file(pkgJson).exists()) &&
      JSON.parse(await file(pkgJson).text()).scripts?.deploy
  ) {
    if (DRY) {
      log(`(dry) (cd ${t.path} && bun run deploy)`);
      return;
    }
    await $`bun run deploy`.cwd(t.path);
    return;
  }

  /* ---------- Nothing to do ---------- */
  log(`⚠️  no deploy task for ${t.path} (skipped)`);
}

function findDirs(root:string){
  const {stdout}=Bun.spawnSync(["bash","-c",`find ${root} -type d -maxdepth 1`]);
  return stdout.toString().trim().split("\n").filter(Boolean).slice(1); // drop root itself
}
