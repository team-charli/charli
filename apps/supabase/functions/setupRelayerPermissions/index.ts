import { ethers } from "https://esm.sh/ethers@5.7.0";
import { LitContracts } from "https://esm.sh/@lit-protocol/contracts-sdk";
import { corsHeaders } from '../_shared/cors.ts';

const RELAYER_MANAGER_PRIVATE_KEY = Deno.env.get("PRIVATE_KEY_MINT_CONTROLLER_PKP") ?? "";
const LIT_NETWORK = Deno.env.get("LIT_NETWORK") ?? "datil-dev";

interface RequestBody {
  relayerPkpTokenId: string;
  approveActionIpfsId: string;
  transferFromActionIpfsId: string;
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
    body.approveActionIpfsId,
    body.transferFromActionIpfsId
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
  if (!body.approveActionIpfsId || !body.transferFromActionIpfsId) {
    throw new Error("Invalid IPFS IDs: approveActionIpfsId and transferFromActionIpfsId are required.");
  }
}

async function setupRelayerPermissions(wallet: ethers.Wallet, relayerPkpTokenId: string, approveActionIpfsId: string, transferFromActionIpfsId: string) {
  console.log("Starting setupRelayerPermissions with inputs:", { relayerPkpTokenId, approveActionIpfsId, transferFromActionIpfsId });

  const contractClient = new LitContracts({ signer: wallet, network: LIT_NETWORK });
  await contractClient.connect();

  console.log("Adding permitted action for approveActionIpfsId");
  await contractClient.pkpPermissionsContractUtils.write.addPermittedAction(
    relayerPkpTokenId,
    approveActionIpfsId,
    [1] // SignAnything scope
  );

  console.log("Adding permitted action for transferFromActionIpfsId");
  await contractClient.pkpPermissionsContractUtils.write.addPermittedAction(
    relayerPkpTokenId,
    transferFromActionIpfsId,
    [1] // SignAnything scope
  );

  console.log("Verifying permissions for approveActionIpfsId");
  const approvePermissionRelayer = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(
    relayerPkpTokenId,
    approveActionIpfsId
  );

  console.log("Verifying permissions for transferFromActionIpfsId");
  const transferFromPermissionRelayer = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(
    relayerPkpTokenId,
    transferFromActionIpfsId
  );

  const allPermissionsSet = approvePermissionRelayer && transferFromPermissionRelayer;
  console.log("All Relayer permissions set correctly:", allPermissionsSet);

  if (!allPermissionsSet) {
    throw new Error("Failed to set all required Relayer permissions");
  }

  return allPermissionsSet;
}
