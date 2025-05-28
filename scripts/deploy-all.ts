#!/usr/bin/env bun
/** Orchestrate deploys.
 *  Flags:
 *    --dry-run        print plan, exit
 *    --only <regex>   deploy subset
 *    --prod           use .env.defaults.prod (default: .env.defaults.dev)
 */
import { createLogger } from "./lib/logger.ts";
import { $, file } from "bun";
import { join, basename } from "path";
import { ethers } from "ethers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import toml from "toml";

const DRY      = Bun.argv.includes("--dry-run");
const ONLY_RE  = (() => { const i = Bun.argv.indexOf("--only"); return i > -1 ? new RegExp(Bun.argv[i+1]) : null;})();
const IS_PROD  = Bun.argv.includes("--prod");
type EnvMap    = Record<string,string>;

// Error collection system
type ErrorReport = {
  type: 'warning' | 'error';
  source: string;
  message: string;
  timestamp: Date;
};

const errorReports: ErrorReport[] = [];

function collectError(type: 'warning' | 'error', source: string, message: string) {
  errorReports.push({
    type,
    source,
    message,
    timestamp: new Date()
  });
}

function reportAccumulatedErrors() {
  if (errorReports.length === 0) {
    log("\n✅ No warnings or errors accumulated during deployment.");
    return;
  }

  log("\n" + "=".repeat(60));
  log("📋 ACCUMULATED WARNINGS AND ERRORS REPORT");
  log("=".repeat(60));
  
  const warnings = errorReports.filter(r => r.type === 'warning');
  const errors = errorReports.filter(r => r.type === 'error');
  
  if (warnings.length > 0) {
    log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach((w, i) => {
      log(`${i + 1}. [${w.source}] ${w.message}`);
    });
  }
  
  if (errors.length > 0) {
    log(`\n❌ ERRORS (${errors.length}):`);
    errors.forEach((e, i) => {
      log(`${i + 1}. [${e.source}] ${e.message}`);
    });
  }
  
  log("\n" + "=".repeat(60));
  log(`Summary: ${warnings.length} warning(s), ${errors.length} error(s)`);
  log("=".repeat(60) + "\n");
}

const log = createLogger({
  mode  : IS_PROD ? "prod" : "dev",
  dryRun: DRY,
});


/*
-- Deploy outline

- set envs
- Lit Actions
- setup-pkp-permissions
- deploy functions
- deploy workers
- deploy frontend
*/


async function main() {
  // Load environment variables first
  const defaults = await loadDefaults(IS_PROD ? ".env.defaults.prod" : ".env.defaults.dev");

  // Apply environment variables to process.env
  Object.entries(defaults).forEach(([key, value]) => {
    process.env[key] = value;
  });

  const dynamic = await pinLitActions("apps/LitActions");

  // Map LIT_ACTION_CID_* to VITE_*_IPFSID format for frontend compatibility
  if (dynamic.LIT_ACTION_CID_PERMITACTION) {
    dynamic.VITE_PERMIT_ACTION_IPFSID = dynamic.LIT_ACTION_CID_PERMITACTION;
  }
  if (dynamic.LIT_ACTION_CID_TRANSFERFROMACTION) {
    dynamic.VITE_TRANSFER_FROM_ACTION_IPFSID = dynamic.LIT_ACTION_CID_TRANSFERFROMACTION;
    // Also set the alternate naming
    dynamic.VITE_LIT_ACTION_IPFS_CID_TRANSFER_FROM_LEARNER = dynamic.LIT_ACTION_CID_TRANSFERFROMACTION;
  }
  if (dynamic.LIT_ACTION_CID_RELAYERACTION) {
    dynamic.VITE_RELAYER_ACTION_IPFSID = dynamic.LIT_ACTION_CID_RELAYERACTION;
    // Also set the alternate naming
    dynamic.VITE_CHARLI_ETHEREUM_RELAYER_ACTION_IPFS_ID = dynamic.LIT_ACTION_CID_RELAYERACTION;
  }
  if (dynamic.LIT_ACTION_CID_CHECKORRESETRELAYERNONCEACTION) {
    dynamic.VITE_CLAIM_KEY_IPFS_ID = dynamic.LIT_ACTION_CID_CHECKORRESETRELAYERNONCEACTION;
  }

  // Log the dynamic variables being passed to Vite for debugging
  log("\n=== Dynamic environment variables for Vite ===");
  for (const [key, value] of Object.entries(dynamic)) {
    if (key.startsWith('VITE_')) {
      log(`${key}: ${value}`);
    }
  }
  log("==============\n");

  const targets = collectTargets().filter(t => !ONLY_RE || ONLY_RE.test(t.path));

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
    log(`  • Permission details:
      - permitAction CID: ${dynamic.LIT_ACTION_CID_PERMITACTION}
      - transferFromAction CID: ${dynamic.LIT_ACTION_CID_TRANSFERFROMACTION}
      - relayerAction CID: ${dynamic.LIT_ACTION_CID_RELAYERACTION}
      - checkOrResetRelayerNonceAction CID: ${dynamic.LIT_ACTION_CID_CHECKORRESETRELAYERNONCEACTION}
      - transferControllerToTeacherAction CID: ${dynamic.LIT_ACTION_CID_TRANSFERCONTROLLERTOTEACHERACTION}
    `);

    await setupPkpPermissions(
      pkpInfo.tokenId,
      dynamic.LIT_ACTION_CID_PERMITACTION,
      dynamic.LIT_ACTION_CID_TRANSFERFROMACTION,
      dynamic.LIT_ACTION_CID_RELAYERACTION,
      dynamic.LIT_ACTION_CID_CHECKORRESETRELAYERNONCEACTION,
      dynamic.LIT_ACTION_CID_TRANSFERCONTROLLERTOTEACHERACTION
    );

    // We'll do the permission verification right before starting the dev server

    // Burn the PKP to make permissions immutable
    log("› Burning the relayer PKP to make permissions immutable");
    await burnPkp(pkpInfo.tokenId);

    // Fund the PKP with gas so it can execute transactions
    // Send 0.01 ETH for development, 0.005 ETH for production (since mainnet gas is more expensive)
    const gasFundingAmount = IS_PROD ? "0.005" : "0.001";
    await fundPkpWithGas(pkpInfo.ethAddress, gasFundingAmount);

    // Update environment variables with the new PKP info
    log("› Updating environment variables with new PKP info");
    await updateEnvFile(
      IS_PROD ? ".env.defaults.prod" : ".env.defaults.dev",
      {
        RELAYER_PKP_TOKEN_ID: pkpInfo.tokenId,
        VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY: pkpInfo.publicKey,
        VITE_CHARLI_ETHEREUM_RELAYER_PKP_ADDRESS: pkpInfo.ethAddress
      }
    );

    // Apply the updated environment variables to the current process
    process.env.RELAYER_PKP_TOKEN_ID = pkpInfo.tokenId;
    process.env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY = pkpInfo.publicKey;
    process.env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_ADDRESS = pkpInfo.ethAddress;

    // Also update the dynamic object with the new PKP info
    dynamic.VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY = pkpInfo.publicKey;
    dynamic.VITE_CHARLI_ETHEREUM_RELAYER_PKP_ADDRESS = pkpInfo.ethAddress;
    dynamic.VITE_RELAYER_PKP_TOKEN_ID = pkpInfo.tokenId; // Make token ID available to frontend

    // Add variables for Supabase functions (without VITE_ prefix)
    dynamic.RELAYER_PKP_PUBLIC_KEY = pkpInfo.publicKey;
    dynamic.RELAYER_PKP_ADDRESS = pkpInfo.ethAddress;
    dynamic.RELAYER_PKP_TOKEN_ID = pkpInfo.tokenId;
  }

  for (const t of targets) {
    const env = { ...defaults, ...dynamic };

    // Unify and enhance debug logging for vite-frontend
    if (basename(t.path) === "vite-frontend") {
      const reqPath = join(t.path, ".env.requirements");
      let reqContent = "";
      try { reqContent = await file(reqPath).text(); } catch (e) {}
      if (reqContent) {
        // Gather all .env.requirements
        const requirements = reqContent
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => !!line && !line.startsWith("#"))
          .map(line => {
            const [k, v] = line.split("=");
            return {
              key: k.trim(),
              dynamic: v && v.trim() === "__DYNAMIC__",
            };
          });

        // Check and warn if a dynamic key is missing in dynamic
        let missingDynamic = false;
        for (const req of requirements) {
          if (req.dynamic && !(req.key in dynamic)) {
            missingDynamic = true;
            const msg = `Dynamic env key ${req.key} required but not set dynamically in this run.`;
            log(`⚠️   [deploy-debug] ${msg}`);
            collectError('warning', 'vite-frontend-env', msg);
          }
        }

        log("[DEBUG] Final environment for vite-frontend deploy:");
        log(
          "    ".padEnd(3) + "KEY".padEnd(44) + ' ' + "VALUE".padEnd(44) + ' ' + "SOURCE"
        );
        log(
          "    ".padEnd(3) + "-".repeat(44) + ' ' + "-".repeat(44) + ' ' + "-".repeat(10)
        );

        for (const req of requirements) {
          const k = req.key;
          const v = typeof env[k] !== "undefined" ? env[k] : undefined;
          let source;
          if (req.dynamic && k in dynamic) source = "dynamic";
          else if (k in defaults) source = "defaults";
          else source = "missing";

          // Format value for log: Print all if short, otherwise first 6...last 6 chars
          let vShort = v;
          if (typeof v === 'string' && v.length > 32)
            vShort = v.slice(0, 6) + "…" + v.slice(-6);

          const emoji = (typeof v !== "undefined") ? "✅" : "❌";
          log(` ${emoji} ${k.padEnd(42)} ${String(vShort ?? "").padEnd(42)} (${source})`);
        }

        log("");
      }
    }
    await injectSecrets(t, env);
    await runDeploy(t, env);
  }
}

main().catch((err) => {
  try {
    log(`✖ Deploy script failed: ${err instanceof Error ? err.stack || err.message : err}`);
  } catch (e) {
    // fallback if logger is somehow broken
    // eslint-disable-next-line no-console
    console.error('✖ Deploy script failed (logging unavailable):', err);
  }
  process.exit(1);
});










/*─────────────────── PKP MINTING HELPERS ───────────────────*/

/**
 * Verifies that all required permissions are correctly set on a PKP
 * @param tokenId The PKP token ID
 * @param permitCid The permit action IPFS CID
 * @param transferFromCid The transferFrom action IPFS CID
 * @param relayerCid The relayer action IPFS CID
 * @param resetNonceCid The reset nonce action IPFS CID
 * @param transferCtrlCid The transfer controller action IPFS CID
 * @throws Error if any permission is not correctly set
 */
async function verifyAllPermissions(
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

  log("Verifying all PKP permissions...");
  const permissions = [
    { cid: permitCid, name: "permitAction" },
    { cid: transferFromCid, name: "transferFromAction" },
    { cid: relayerCid, name: "relayerAction" },
    { cid: resetNonceCid, name: "checkOrResetRelayerNonceAction" },
    { cid: transferCtrlCid, name: "transferControllerToTeacherAction" }
  ];

  // Verify that each action has the correct permission
  for (const { cid, name } of permissions) {
    log(`  • Verifying permission for ${name} (${cid})`);
    const isPermitted = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(tokenId, cid);
    if (!isPermitted) {
      const errorMsg = `❌ Permission verification FAILED for ${name} (${cid})`;
      log(errorMsg);
      throw new Error(errorMsg);
    }
    log(`    ✅ Permission verified for ${name} (${cid})`);
  }

  // Also check specific permissions that are critical for your app flow
  log("  • Verifying critical permission flows...");

  // 1. Check if permitAction can call relayerAction (this is the flow failing now)
  log(`    • Checking if permitAction can call relayerAction`);
  const permitCanCallRelayer = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(tokenId, relayerCid);
  if (!permitCanCallRelayer) {
    const errorMsg = `❌ Critical flow verification FAILED: permitAction cannot call relayerAction`;
    log(errorMsg);
    throw new Error(errorMsg);
  }
  log(`      ✅ permitAction can call relayerAction`);

  // 2. Check if transferFromAction can use the PKP
  log(`    • Checking if transferFromAction has permission`);
  const transferFromHasPermission = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(tokenId, transferFromCid);
  if (!transferFromHasPermission) {
    const errorMsg = `❌ Critical flow verification FAILED: transferFromAction does not have permission`;
    log(errorMsg);
    throw new Error(errorMsg);
  }
  log(`      ✅ transferFromAction has permission`)

  log("  ✅ All permissions verified successfully");
}

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
 * Fund a newly minted PKP with gas
 * @param pkpAddress The Ethereum address of the PKP to fund
 * @param amount Amount of ETH to send in ether units (e.g., "0.01" for 0.01 ETH)
 */
async function fundPkpWithGas(pkpAddress: string, amount: string) {
  // Determine which network we're on based on IS_PROD flag
  const networkName = IS_PROD ? "Base Mainnet" : "Base Sepolia";
  const rpcUrl = IS_PROD
    ? process.env.PROVIDER_URL_BASE_MAINNET || "https://mainnet.base.org"
    : process.env.PROVIDER_URL_BASE_SEPOLIA || "https://sepolia.base.org";

  log(`› Funding PKP with gas on ${networkName}`);
  log(`  • PKP address: ${pkpAddress}`);
  log(`  • Amount: ${amount} ETH`);

  const privateKey = process.env.RELAYER_MANAGER_PRIVATE_KEY!;
  if (!privateKey) {
    throw new Error("RELAYER_MANAGER_PRIVATE_KEY environment variable is not set");
  }

  try {
    // Connect to the network
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Check funder wallet balance
    const balance = await provider.getBalance(wallet.address);
    const formattedBalance = ethers.utils.formatEther(balance);
    log(`  • Funder wallet balance: ${formattedBalance} ETH`);

    if (balance.lt(ethers.utils.parseEther(amount))) {
      const msg = `Funder wallet has insufficient funds (${formattedBalance} ETH) to send ${amount} ETH`;
      log(`⚠️ Warning: ${msg}`);
      collectError('warning', 'pkp-funding', msg);
      // Continue execution, but log a warning
    }

    // Send transaction
    const tx = await wallet.sendTransaction({
      to: pkpAddress,
      value: ethers.utils.parseEther(amount),
      gasLimit: 30000 // Explicit gas limit for a simple ETH transfer
    });

    log(`  • Gas funding transaction sent: ${tx.hash}`);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    log(`  • Gas funding transaction confirmed in block ${receipt.blockNumber}`);

    return receipt.transactionHash;
  } catch (error) {
    const msg = `Failed to fund PKP with gas: ${error.message}`;
    log(`✖ ${msg}`);
    collectError('error', 'pkp-funding', msg);
    // Don't throw the error, as this is not a critical failure for deployment
    // Just log it and continue with the deployment process
    return null;
  }
}

/**
 * Burns a PKP by transferring it to a dead address
 * @param tokenId The PKP token ID to burn
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
    txt.split(/\r?\n/)
      .filter(Boolean)
      .filter(l => !l.trim().startsWith('#'))  // Skip comment lines
      .map(l=>{
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

    // Prefer wrangler.jsonc for config
    let configFlag = '';
    if (await file(join(t.path, 'wrangler.jsonc')).exists()) configFlag = '--config wrangler.jsonc';
    else if (await file(join(t.path, 'wrangler.json')).exists()) configFlag = '--config wrangler.json';

    // 1️⃣ secrets that already exist on the remote worker
    const wranglerArgs = [
      'wrangler', 'secret', 'list',
      '--name', name,
      '--format', 'json',
    ];
    if (configFlag) wranglerArgs.push('--config', configFlag.split(' ')[1]);
    log(`ℹ️  [injectSecrets] Running: bunx ${wranglerArgs.join(' ')} (cwd: ${t.path})`);
    let secretJson = [];
    let cmdResult;
    try {
      cmdResult = await $`bunx ${wranglerArgs}`.quiet().cwd(t.path);
    } catch (err) {
      const msg = `wrangler secret list failed for ${name}: ${err?.stderr ?? err?.message ?? err}`;
      log(`⚠️  ${msg}`);
      collectError('warning', 'wrangler-secrets', msg);
      if (err?.stdout) log(`[injectSecrets] stdout:\n${err.stdout}`);
      if (err?.stderr) log(`[injectSecrets] stderr:\n${err.stderr}`);
      log(`[injectSecrets] Will treat this as 'no secrets', and continue.`);
    }
    if (cmdResult && cmdResult.exitCode !== 0) {
      const msg = `wrangler secret list exit code for ${name}: ${cmdResult.exitCode}`;
      log(`⚠️  ${msg}`);
      collectError('warning', 'wrangler-secrets', msg);
      log(`[injectSecrets] stdout:\n${cmdResult.stdout}`);
      log(`[injectSecrets] stderr:\n${cmdResult.stderr}`);
    }
    try {
      secretJson = cmdResult && cmdResult.stdout?.toString().trim()
        ? JSON.parse(cmdResult.stdout.toString())
        : [];
    } catch (jsonErr) {
      const msg = `Failed to parse wrangler secret list output as JSON for ${name}: ${jsonErr}`;
      log(`⚠️  ${msg}`);
      collectError('warning', 'wrangler-secrets', msg);
      log(`[injectSecrets] Raw stdout was: ${cmdResult?.stdout}`);
      secretJson = [];
    }
    const existingSecretNames = new Set((secretJson).map((k: any) => k.name));

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
          const jsonString = raw
            .replace(/\/\*[\s\S]*?\*\//g, "")  // Remove /* */ comments
            .replace(/\/\/.*$/gm, "")          // Remove // comments
            .replace(/,\s*([}\]])/g, "$1");     // Remove trailing commas
          const json = JSON.parse(jsonString);
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
      // Create a temporary JSON file with the secrets
      const tempFile = `/tmp/wrangler-secrets-${Date.now()}.json`;
      await Bun.write(tempFile, JSON.stringify(freshOnly));

      // Use bunx wrangler like other wrangler commands in this script
      const wranglerArgs = ['wrangler', 'secret', 'bulk', tempFile, '--name', name];
      if (configFlag) {
        const arg = configFlag.split(' ')[1];
        wranglerArgs.push('--config', arg);
      }

      log(`ℹ️  [injectSecrets] Running: bunx ${wranglerArgs.join(' ')} (cwd: ${t.path})`);

      // Run with proper working directory, consistent with deploy commands
      const result = await $`bunx ${wranglerArgs}`.cwd(t.path);

      if (result.exitCode !== 0) {
        throw new Error(`Failed with exit code ${result.exitCode}`);
      }

      // Clean up the temporary file
      await $`rm ${tempFile}`.quiet();
    } catch (err) {
      const msg = `wrangler secret bulk failed for ${name}: ${(err && err.stderr) ? err.stderr : err}`;
      log(`⚠️  ${msg}`);
      collectError('error', 'wrangler-secrets', msg);
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
async function runDeploy(t: { type: string; path: string }, env: Record<string, string>) {
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
    try {
      await $`supabase functions deploy ${fnName} \
        --project-ref ${PROJECT_REF} \
        --no-verify-jwt \
        --workdir ${WORKDIR}`;
    } catch (err) {
      const msg = `Deploy failed for ${fnName}: ${err?.stderr?.toString() || err?.message || err}`;
      log(`✖ ${msg}`);
      collectError('error', 'supabase-deploy', msg);
      if (err && (err.stdout || err.stderr)) {
        if (err.stdout) log(`[stdout]:\n${err.stdout.toString()}`);
        if (err.stderr) log(`[stderr]:\n${err.stderr.toString()}`);
      } else {
        log(`[error thrown]: ${err}`);
      }
      throw err;
    }
    return;
  }

  /* ---------- Cloudflare Workers ---------- */
  if (t.type === "cf-worker") {
    // Prefer wrangler.jsonc/json, fallback wrangler.toml
    let wranglerConfig = '';
    if (await file(join(t.path, 'wrangler.jsonc')).exists()) wranglerConfig = '--config wrangler.jsonc';
    else if (await file(join(t.path, 'wrangler.json')).exists()) wranglerConfig = '--config wrangler.json';
    else if (await file(join(t.path, 'wrangler.toml')).exists()) wranglerConfig = '--config wrangler.toml';
    else {
      log(`⏭️  ${basename(t.path)} – no wrangler.{jsonc,json,toml}, nothing to deploy`);
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

    try {
      const deployArgs = ['wrangler', 'deploy'];
      if (wranglerConfig) {
        // wranglerConfig is e.g. '--config wrangler.jsonc'
        const splitCfg = wranglerConfig.split(' ');
        deployArgs.push(splitCfg[0], splitCfg[1]);
      }
      if (DRY) log(`(dry) bunx ${deployArgs.join(' ')}`);
      else await $`bunx ${deployArgs}`.cwd(t.path);
    } catch (err) {
      /* Wrangler build errors: log & move on instead of crashing */
      if (err instanceof Error) {
        const msg = `wrangler deploy failed for ${basename(t.path)}: ${err.stderr ?? err.message}`;
        log(`⚠️  ${msg} – skipping`);
        collectError('warning', 'cf-worker-deploy', msg);
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

    // Log env for debugging
    log("[DEBUG] Environment for vite dev server:");
    for (const [k, v] of Object.entries(env)) {
      if (k.includes("VITE") || k.includes("PKP") || k.toLowerCase().includes("relayer")) {
        log(`    ${k}=${v}`);
      }
    }

    // Verify permissions before starting the vite server
    if (!DRY) {
      log("\n\n===== VERIFYING PKP PERMISSIONS BEFORE STARTING FRONTEND =====");
      try {
        // Get tokenId from env, which should be set at this point
        const tokenId = process.env.RELAYER_PKP_TOKEN_ID;
        if (!tokenId) {
          throw new Error("RELAYER_PKP_TOKEN_ID not found in environment");
        }

        log(`• Using PKP with tokenId: ${tokenId}`);
        log(`• Key env variables:`);
        log(`  - VITE_PERMIT_ACTION_IPFSID: ${env.VITE_PERMIT_ACTION_IPFSID}`);
        log(`  - VITE_RELAYER_ACTION_IPFSID: ${env.VITE_RELAYER_ACTION_IPFSID}`);
        log(`  - VITE_TRANSFER_FROM_ACTION_IPFSID: ${env.VITE_TRANSFER_FROM_ACTION_IPFSID}`);
        log(`  - VITE_CLAIM_KEY_IPFS_ID: ${env.VITE_CLAIM_KEY_IPFS_ID}`);

        // Verify all permissions properly
        // Determine the transferControllerToTeacher CID
        // Use the one from env if available (better), otherwise try to get from LIT_ACTION format
        const transferCtrlCid = env.VITE_TRANSFER_CONTROLLER_TO_TEACHER_ACTION_IPFSID ||
                               env.LIT_ACTION_CID_TRANSFERCONTROLLERTOTEACHERACTION;

        if (!transferCtrlCid) {
          const msg = `Could not find TRANSFER_CONTROLLER_TO_TEACHER CID in environment`;
          log(`⚠️ Warning: ${msg}`);
          collectError('warning', 'vite-frontend-env', msg);
        }

        await verifyAllPermissions(
          tokenId,
          env.VITE_PERMIT_ACTION_IPFSID,
          env.VITE_TRANSFER_FROM_ACTION_IPFSID,
          env.VITE_RELAYER_ACTION_IPFSID,
          env.VITE_CLAIM_KEY_IPFS_ID,
          transferCtrlCid || "" // Empty string fallback
        );
        log("✅ All permissions verified successfully!");
        log("===== PERMISSION VERIFICATION COMPLETE =====\n\n");
      } catch (error) {
        const msg = `PERMISSION VERIFICATION FAILED: ${error.message}`;
        log(`❌ ${msg}`);
        collectError('error', 'pkp-permissions', msg);
        if (!IS_PROD) {
          log("⚠️ Continuing with dev server despite permission errors for debugging");
        } else {
          throw error; // Re-throw in production to stop deployment
        }
      }
    }

    // Report all accumulated errors and warnings
    reportAccumulatedErrors();

    if (IS_PROD) {
      // production build + wrangler deploy (still fine under Bun)
      log("› Deploying vite-frontend to Cloudflare");
      await $`node node_modules/.bin/vite`.cwd(t.path).env(env);
    } else {
      // local dev server ⇢ run Vite inside real Node
      log("› Running vite-frontend in development mode (node)");
      await $`node node_modules/.bin/vite --port 5173`.cwd(t.path).env(env);
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
