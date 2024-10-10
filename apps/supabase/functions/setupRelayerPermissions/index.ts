import { ethers } from "https://esm.sh/ethers@5.7.0";
import { LitContracts } from "https://esm.sh/@lit-protocol/contracts-sdk";
import { corsHeaders } from '../_shared/cors.ts';

const RELAYER_MANAGER_PRIVATE_KEY = Deno.env.get("RELAYER_MANAGER_PRIVATE_KEY") ?? "";
const LIT_NETWORK = Deno.env.get("LIT_NETWORK") ?? "datil-dev";

interface RequestBody {
  relayerPkpTokenId: string;
  permitActionIpfsId: string;
  transferFromActionIpfsId: string;
  relayerActionIpfsId: string;
  resetPkpNonceIpfsId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read the body once
  const body: RequestBody = await req.json();

  // Validate inputs
  validateInputs(body);

  const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
  const wallet = new ethers.Wallet(RELAYER_MANAGER_PRIVATE_KEY , provider);

  const result = await setupRelayerPermissions(
    wallet,
    body.relayerPkpTokenId,
    body.permitActionIpfsId,
    body.transferFromActionIpfsId,
    body.relayerActionIpfsId,
    body.resetPkpNonceIpfsId
  );

  return new Response(JSON.stringify({ success: result }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function validateInputs(body: RequestBody): void {
  if (!ethers.BigNumber.isBigNumber(body.relayerPkpTokenId) && isNaN(Number(body.relayerPkpTokenId))) {
    throw new Error("Invalid relayerPkpTokenId: Must be a valid BigNumber string.");
  }
  if (!body.permitActionIpfsId || !body.transferFromActionIpfsId || !body.relayerActionIpfsId || !body.resetPkpNonceIpfsId) {
    throw new Error("Invalid IPFS IDs: permitActionIpfsId, transferFromActionIpfsId, relayerActionIpfsId, and resetPkpNonceIpfsId are required.");
  }
}

async function setupRelayerPermissions(
  wallet: ethers.Wallet,
  relayerPkpTokenId: string,
  permitActionIpfsId: string,
  transferFromActionIpfsId: string,
  relayerActionIpfsId: string,
  resetPkpNonceIpfsId: string
) {
  console.log("Starting setupRelayerPermissions with inputs:", { relayerPkpTokenId, permitActionIpfsId, transferFromActionIpfsId, relayerActionIpfsId, resetPkpNonceIpfsId });

  const contractClient = new LitContracts({ signer: wallet, network: LIT_NETWORK });
  await contractClient.connect();

  console.log("Adding permitted action for permitActionIpfsId");
  await contractClient.pkpPermissionsContractUtils.write.addPermittedAction(
    relayerPkpTokenId,
    permitActionIpfsId,
    [1] // SignAnything scope
  );

  console.log("Adding permitted action for transferFromActionIpfsId");
  await contractClient.pkpPermissionsContractUtils.write.addPermittedAction(
    relayerPkpTokenId,
    transferFromActionIpfsId,
    [1] // SignAnything scope
  );

  console.log("Adding permitted action for relayerActionIpfsId");
  await contractClient.pkpPermissionsContractUtils.write.addPermittedAction(
    relayerPkpTokenId,
    relayerActionIpfsId,
    [1] // SignAnything scope
  );

  console.log("Adding permitted action for resetPkpNonceIpfsId");
  await contractClient.pkpPermissionsContractUtils.write.addPermittedAction(
    relayerPkpTokenId,
    resetPkpNonceIpfsId,
    [1] // SignAnything scope
  );

  console.log("Verifying permissions for permitActionIpfsId");
  const permitPermissionRelayer = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(
    relayerPkpTokenId,
    permitActionIpfsId
  );

  console.log("Verifying permissions for transferFromActionIpfsId");
  const transferFromPermissionRelayer = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(
    relayerPkpTokenId,
    transferFromActionIpfsId
  );

  console.log("Verifying permissions for relayerActionIpfsId");
  const relayerActionPermissionRelayer = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(
    relayerPkpTokenId,
    relayerActionIpfsId
  );

  console.log("Verifying permissions for resetPkpNonceIpfsId");
  const resetPkpNoncePermissionRelayer = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(
    relayerPkpTokenId,
    resetPkpNonceIpfsId
  );

  const allPermissionsSet = permitPermissionRelayer && transferFromPermissionRelayer && relayerActionPermissionRelayer && resetPkpNoncePermissionRelayer;
  console.log("All Relayer permissions set correctly:", allPermissionsSet);

  if (!allPermissionsSet) {
    throw new Error("Failed to set all required Relayer permissions");
  }

  return allPermissionsSet;
}
