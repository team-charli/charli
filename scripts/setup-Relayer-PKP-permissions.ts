#!/usr/bin/env bun
/**
 * setup-Relayer-PKP-permissions.ts
 * -----------------------------------------------------------
 * Run once, right after you pin new Lit Actions, to grant your
 * **relayer PKP** permission to execute those actions on-chain.
 *
 * It talks directly to the Lit PKP Permissions contract via
 * ethers.js, so you do *not* need the Supabase Edge Function.
 * 
 * NOTE: This script is now intended to be called from deploy-all.ts
 * which handles minting a new PKP, setting permissions, and burning.
 * The standalone version is still available for manual use.
 *
 * USAGE (example)
 *   bun run setup-pkp-permissions.ts \
 *        --token  12345678901234567890               \
 *        --permit bafyPermitCID                      \
 *        --transferFrom bafyTransferFromCID          \
 *        --relayer bafyRelayerCID                   \
 *        --resetNonce bafyResetNonceCID              \
 *        --transferController bafyTransferCtrlCID
 *
 * Required ENV
 *   RELAYER_MANAGER_PRIVATE_KEY   // wallet that owns the relayer PKP
 *   LIT_NETWORK                   // e.g. "datil-dev"
 *
 * Exit code 0 if *all* permissions are set, otherwise throws.
 * -----------------------------------------------------------
 */

import { config } from "dotenv";
config();           // loads .env.defaults.dev / prod

import { argv } from "bun";
import { ethers } from "ethers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import type { LIT_NETWORKS_KEYS } from "@lit-protocol/types";

/* ------------------------ CLI arg parsing ----------------- */
function grab(flag: string): string {
  const i = argv.indexOf(flag);
  if (i === -1 || !argv[i + 1]) throw new Error(`Missing ${flag}`);
  return argv[i + 1];
}

const params = {
  tokenId:            grab("--token"),
  permitCid:          grab("--permit"),
  transferFromCid:    grab("--transferFrom"),
  relayerCid:         grab("--relayer"),
  resetNonceCid:      grab("--resetNonce"),
  transferCtrlCid:    grab("--transferController"),
};

/* ------------------------ Validation ---------------------- */
if (isNaN(Number(params.tokenId)))
  throw new Error("relayerPkpTokenId must be a numeric string");

Object.entries(params).forEach(([k, v]) => {
  if (k !== "tokenId" && !v.startsWith("bafy"))
    throw new Error(`Invalid CID for ${k}: ${v}`);
});

/* ------------------------ Chain setup --------------------- */
const PROVIDER_URL = "https://yellowstone-rpc.litprotocol.com";

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const wallet   = new ethers.Wallet(
  process.env.RELAYER_MANAGER_PRIVATE_KEY!,
  provider
);

/** Validate env var against allowed keys */
function getLitNetwork(): LIT_NETWORKS_KEYS {
  const n = process.env.LIT_NETWORK as string | undefined;

  const allowed = ["datil-dev", "datil-test", "datil", "custom"] as const;
  return allowed.includes(n as any) ? (n as LIT_NETWORKS_KEYS) : "datil-dev";
}
const lit = new LitContracts({
  signer:  wallet,
  network: getLitNetwork(),
});
await lit.connect();

/* ------------------------ Helper -------------------------- */
async function addAndVerify(cid: string) {
  await lit.pkpPermissionsContractUtils.write.addPermittedAction(
    params.tokenId,
    cid,
  );
  return lit.pkpPermissionsContractUtils.read.isPermittedAction(
    params.tokenId,
    cid
  );
}

/* ------------------------ Main ---------------------------- */
console.log("⏳ Setting PKP permissions…");

const results = await Promise.all([
  addAndVerify(params.permitCid),
  addAndVerify(params.transferFromCid),
  addAndVerify(params.relayerCid),
  addAndVerify(params.resetNonceCid),
  addAndVerify(params.transferCtrlCid),
]);

if (results.every(Boolean)) {
  console.log("✅ All permissions set.");
  process.exit(0);
} else {
  throw new Error("One or more permissions failed to set.");
}
