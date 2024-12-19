// @ts-ignore cross-fetch polyfill type resolution issue
import { LitNodeClientNodeJs } from "@lit-protocol/lit-node-client-nodejs";
import { corsHeaders } from '../_shared/cors.ts';
import * as json from "multiformats/codecs/json";
import { sha256 } from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";

const PINATA_GATEWAY = "chocolate-deliberate-squirrel-286.mypinata.cloud";
const FINALIZE_LIT_ACTION_IPFS_CID = Deno.env.get('FINALIZE_LIT_ACTION_IPFS_CID') ?? "";

async function fetchFromIPFS(ipfsHash: string) {
  const response = await fetch(`https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  return response.json();
}

async function validateIPFSData(data: any, providedHash: string): Promise<boolean> {
  // Convert data to bytes
  const bytes = json.encode(data)

  // Calculate the hash of the data
  const hash = await sha256.digest(bytes)

  // Create a CID (v1) from the hash
  const calculatedCID = CID.create(1, json.code, hash)

  // Compare the calculated CID with the provided hash
  return calculatedCID.toString() === providedHash
}
Deno.serve(async (req: Request): Promise<Response> => {
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
    const { sessionDataIpfsHash, finalizationType, faultData, roomId } = await req.json();

    // Initialize Lit Node Client
    const litNodeClient = new LitNodeClientNodeJs({
      litNetwork: 'datil-dev'
    });

    // Connect to Lit Network
    // @ts-ignore method exists at runtime
    await litNodeClient.connect();

    // Get auth signature
    const authSig = await litNodeClient.getWalletSig({
      chain: "ethereum",
      resources: [`litAction://${FINALIZE_LIT_ACTION_IPFS_CID}`]
    });

    // Get session signatures
    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: "ethereum",
      resources: [`litAction://${FINALIZE_LIT_ACTION_IPFS_CID}`],
      authSig: authSig,
    });

    // Fetch session data
    const sessionData = await fetchFromIPFS(sessionDataIpfsHash);
    // Verify the data
    const isValid = await validateIPFSData(sessionData, sessionDataIpfsHash);
    if (!isValid) {
      throw new Error('Session data verification failed - CID mismatch');
    }
    // Execute Lit Action
    const results = await litNodeClient.executeJs({
      code: FINALIZE_LIT_ACTION_IPFS_CID,
      sessionSigs: sessionSigs,
      jsParams: {
        sessionData: sessionData,
        finalizationType,
        faultData,
        roomId
      },
    });

    // Cleanup
    // @ts-ignore method exists at runtime
    await litNodeClient.disconnect();

    // Return results
    return new Response(JSON.stringify({
      transactionHash: results.response.transactionHash,
      litActionIpfsHash: results.response.ipfsHash
    }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

  } catch (e: unknown) {
    const error = e as Error & { code?: string };
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      }
    }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/execute-finalize-action' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
