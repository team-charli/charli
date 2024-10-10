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

  try {
    const body: RequestBody = await req.json();
    validateInputs(body);

    const result = await checkRelayerPermissions(
      body.relayerPkpTokenId,
      body.permitActionIpfsId,
      body.transferFromActionIpfsId,
      body.relayerActionIpfsId,
      body.resetPkpNonceIpfsId
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function validateInputs(body: RequestBody): void {
  if (isNaN(Number(body.relayerPkpTokenId))) {
    throw new Error("Invalid relayerPkpTokenId: Must be a valid BigNumber string.");
  }
  if (!body.permitActionIpfsId || !body.transferFromActionIpfsId || !body.relayerActionIpfsId || !body.resetPkpNonceIpfsId) {
    throw new Error("Invalid IPFS IDs: permitActionIpfsId, transferFromActionIpfsId, relayerActionIpfsId, and resetPkpNonceIpfsId are required.");
  }
}

async function checkRelayerPermissions(
  relayerPkpTokenId: string,
  permitActionIpfsId: string,
  transferFromActionIpfsId: string,
  relayerActionIpfsId: string,
  resetPkpNonceIpfsId: string
) {
  console.log("Starting checkRelayerPermissions with inputs:", { relayerPkpTokenId, permitActionIpfsId, transferFromActionIpfsId, relayerActionIpfsId, resetPkpNonceIpfsId });

  const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
  const wallet = new ethers.Wallet(RELAYER_MANAGER_PRIVATE_KEY, provider);

  const contractClient = new LitContracts({ signer: wallet, network: LIT_NETWORK });
  await contractClient.connect();

  const actions = [
    { name: "permitActionIpfsId", id: permitActionIpfsId },
    { name: "transferFromActionIpfsId", id: transferFromActionIpfsId },
    { name: "relayerActionIpfsId", id: relayerActionIpfsId },
    { name: "resetPkpNonceIpfsId", id: resetPkpNonceIpfsId }
  ];

  const results = {};

  for (const action of actions) {
    console.log(`Verifying permissions for ${action.name}`);
    const isPermitted = await contractClient.pkpPermissionsContractUtils.read.isPermittedAction(
      relayerPkpTokenId,
      action.id
    );
    results[action.name] = isPermitted;

    console.log(`${action.name} permission status:`, isPermitted);
  }

  const allPermissionsSet = Object.values(results).every(Boolean);
  console.log("All Relayer permissions set correctly:", allPermissionsSet);

  return {
    success: allPermissionsSet,
    permissions: results
  };
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/checkRelayerPkpPermittedActions-dev' \
    --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"relayerPkpTokenId": "YOUR_TOKEN_ID", "permitActionIpfsId": "YOUR_IPFS_ID", "transferFromActionIpfsId": "YOUR_IPFS_ID", "relayerActionIpfsId": "YOUR_IPFS_ID", "resetPkpNonceIpfsId": "YOUR_IPFS_ID"}'

*/
