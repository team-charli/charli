import { LitNodeClient } from "https://esm.sh/@lit-protocol/lit-node-client";
import { ethers } from "https://esm.sh/ethers@5.7.0";
import { corsHeaders } from '../_shared/cors.ts';

const PINATA_API_KEY = Deno.env.get('PINATA_API_KEY')!;
const PINATA_API_SECRET = Deno.env.get('PINATA_SECRET_API_KEY')!;
const PRIVATE_KEY = Deno.env.get('PRIVATE_KEY')!;
const LIT_NETWORK = Deno.env.get('LIT_NETWORK') ?? 'datil-dev';
const PINNING_LIT_ACTION_IPFS_CID = Deno.env.get('PINNING_LIT_ACTION_IPFS_CID')?? "QmVZSSSeiKqd6XvbzkHGYMDWUjirg3M6cgEJqB4sZGbqee";


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
    const { linkData } = await req.json();

    const litNodeClient = new LitNodeClient({ litNetwork: LIT_NETWORK });
    await litNodeClient.connect();

    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const authSig = await LitNodeClient.signAndSaveAuthMessage({
      web3: wallet,
      chainId: 1,
      resources: [`litAction://${PINNING_LIT_ACTION_IPFS_CID}`],
    });

    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: "ethereum",
      resources: [`litAction://${PINNING_LIT_ACTION_IPFS_CID}`],
      authSig,
    });

    const results = await litNodeClient.executeJs({
      code: PINNING_LIT_ACTION_IPFS_CID,
      sessionSigs,
      jsParams: {
        linkData,
        pinataApiKey: PINATA_API_KEY,
        pinataSecretApiKey: PINATA_API_SECRET,
      },
    });

    await litNodeClient.disconnect();

    return new Response(JSON.stringify({ ipfsHash: results.response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing request", { error: error.message, stack: error.stack });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
