///Users/zm/Projects/charli/apps/supabase/functions/get-controller-key-claim-data/index.ts

import { Hono } from 'jsr:@hono/hono';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ethers } from "https://esm.sh/ethers@5.7.0";
import { LitNodeClientNodeJs } from 'https://esm.sh/@lit-protocol/lit-node-client-nodejs@7';
import { LitContracts } from "https://esm.sh/@lit-protocol/contracts-sdk@6";
import {
  LitActionResource,
  createSiweMessageWithRecaps,
  LitAbility
} from "https://esm.sh/@lit-protocol/auth-helpers@6";
import { corsHeaders } from '../_shared/cors.ts';

const PRIVATE_KEY = Deno.env.get("PRIVATE_KEY_MINT_CONTROLLER_PKP") ?? "";
const LIT_NETWORK = Deno.env.get("LIT_NETWORK") ?? "datil-dev";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,   {
    auth: {
      persistSession: false
    }
  });

// Signature interface
interface Signature {
  r: string;
  s: string;
  v: number;
}

// Body parameters interface for the POST request
interface RequestBody {
  keyId: string;
  learnerId: number;
}

// Create the Hono app
const app = new Hono();

// Attach CORS headers globally
app.use('*', async (c, next) => {
  for (const [key, value] of Object.entries(corsHeaders)) {
    c.header(key, value);
  }
  // Handle OPTIONS request
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  await next();
});

// Main route
app.post('/get-controller-key-claim-data', async (c) => {
  try {
    // Parse body
    const body: RequestBody = await c.req.json();
    console.log("Request body:", body);

    // Validate required fields
    if (!body.keyId) {
      console.error("Missing keyId in request");
      return c.json({ error: "Missing keyId in request" }, 400);
    }
    if (!body.learnerId === undefined || !body.learnerId === null) {
      console.error("Missing learnerId in request");
      return c.json({ error: "Missing learnerId in request" }, 400);
    }

    const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Connect LitNodeClient
    const litNodeClient = new LitNodeClientNodeJs({ litNetwork: LIT_NETWORK, debug: false });
    await litNodeClient.connect();

    // Obtain session signatures
    const sessionSigs = await getSessionSigs(litNodeClient, wallet);

    // Insert and retrieve controller key claim data
    const controllerKeyClaimData = await getControllerKeyClaimData(
      body.keyId,
      body.learnerId,
      sessionSigs,
      litNodeClient,
      wallet
    );

    // Disconnect cleanly
    await litNodeClient.disconnect();

    console.log("Key Claim Complete. Returning Key Claim Data", { result: controllerKeyClaimData });
    return c.json(controllerKeyClaimData, 200);
  } catch (error: any) {
    console.error("Unexpected error", { error: error.message, stack: error.stack });
    return c.json({ error: "Unexpected error occurred", details: error.message }, 500);
  }
});

// Helper function #1: getSessionSigs
async function getSessionSigs(litNodeClient: any, wallet: ethers.Wallet) {
  // Hono doesn't change the logic; we just nest it in here
  const authNeededCallback = async ({
    uri,
    expiration,
    resourceAbilityRequests,
  }: {
    uri: string;
    expiration: string;
    resourceAbilityRequests: any[];
  }) => {
    if (!uri || !expiration || !resourceAbilityRequests) {
      await litNodeClient.disconnect();
      throw new Error("Missing required parameters");
    }

    const toSign = await createSiweMessageWithRecaps({
      uri,
      expiration,
      resources: resourceAbilityRequests,
      walletAddress: wallet.address,
      nonce: await litNodeClient.getLatestBlockhash(),
      litNodeClient,
    });

    const signature = await wallet.signMessage(toSign);

    return {
      sig: signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: toSign,
      address: wallet.address,
    };
  };

  return await litNodeClient.getSessionSigs({
    chain: "ethereum",
    resourceAbilityRequests: [
      {
        resource: new LitActionResource("*"),
        ability: LitAbility.LitActionExecution,
      },
    ],
    authNeededCallback,
  });
}

// Helper function #2: getControllerKeyClaimData
async function getControllerKeyClaimData(
  keyId: string,
  learnerId: number,
  sessionSigs: any,
  litNodeClient: any,
  wallet: ethers.Wallet
) {
  try {
    await validateLearnerId(learnerId);
    const contractClient = new LitContracts({ signer: wallet, network: LIT_NETWORK, debug: false });
    await contractClient.connect();

    const claimActionRes = await litNodeClient.executeJs({
      sessionSigs,
      code: `(async () => { Lit.Actions.claimKey({keyId}); })();`,
      jsParams: { keyId },
    });

    if (claimActionRes && claimActionRes.claims) {
      const derivedKeyId = claimActionRes.claims[keyId].derivedKeyId;
      const rawControllerClaimKeySigs = claimActionRes.claims[keyId].signatures;
      const condensedSigs = condenseSignatures(rawControllerClaimKeySigs);

      try {
        const publicKey = await contractClient.pubkeyRouterContract.read.getDerivedPubkey(
          contractClient.stakingContract.read.address,
          `0x${derivedKeyId}`
        );

        // Prepare key_claim_data
        const key_claim_data = {
          derivedKeyId,
          condensedSigs,
        };
        const controllerAddress = ethers.utils.computeAddress(publicKey);

        const { data, error } = await supabaseClient
          .from('sessions')
          .insert({
            key_claim_data,
            request_origin_type: 'learner',
            learner_id: learnerId,
            controller_public_key: publicKey,
            controller_address: controllerAddress,
          })
          .select();

        if (error) {
          console.error('Error updating data in Supabase:', error);
          throw error;
        }
        if (!data || data.length === 0) {
          throw new Error('No data returned after insertion');
        }

        const sessionId = data[0].session_id;
        return { publicKey, sessionId };
      } catch (error: any) {
        console.error('Detailed error in insert:', {
          message: error.message,
          name: error.name,
          cause: error.cause,
          stack: error.stack,
          ...error
        });
        throw error;
      }
    } else {
      throw new Error("Claim action did not return expected results");
    }
  } catch (error: any) {
    console.log("Error in getControllerKeyClaimData", { error: error.message, stack: error.stack });
    await litNodeClient.disconnect();
    throw error;
  }
}

// Helper function #3: condenseSignatures
function condenseSignatures(signatures: Signature[]): string[] {
  return signatures.map(sig => {
    // Pad v to 2 hex characters
    const vHex = ethers.utils.hexZeroPad(ethers.utils.hexlify(sig.v), 1);
    // Concatenate r, s, and v
    const combined = sig.r + sig.s.slice(2) + vHex.slice(2);
    // Convert to Uint8Array and encode to Base64
    return ethers.utils.base64.encode(ethers.utils.arrayify(combined));
  });
}

// Add explicit validation of the learner_id
async function validateLearnerId(learnerId: number) {
  const { data, error } = await supabaseClient
    .from('user_data')
    .select('id')
    .eq('id', learnerId)
    .single();

  if (error || !data) {
    throw new Error('Invalid learner_id');
  }
}
// Final: Start the server
Deno.serve(async (req) => {
  try {
    return await app.fetch(req);
  } catch (error: any) {
    console.error("Error in request handler:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
