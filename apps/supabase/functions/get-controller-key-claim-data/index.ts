import { createClient } from 'jsr:@supabase/supabase-js@2'
import { ethers } from "https://esm.sh/ethers@5.7.0";
import { LitContracts } from "https://esm.sh/@lit-protocol/contracts-sdk";
import * as LitNodeClient from "https://esm.sh/@lit-protocol/lit-node-client-nodejs";
import { AuthCallback, LitAbility } from "https://esm.sh/@lit-protocol/types";
import { LitActionResource, createSiweMessageWithRecaps } from "https://esm.sh/@lit-protocol/auth-helpers";
import { corsHeaders } from '../_shared/cors.ts';

const PRIVATE_KEY = Deno.env.get("PRIVATE_KEY_MINT_CONTROLLER_PKP") ?? "";
const LIT_NETWORK = Deno.env.get("LIT_NETWORK") ?? "datil-dev";


const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabaseClient = createClient(supabaseUrl, supabaseKey)

interface Signature {
  r: string;
  s: string;
  v: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method === "POST") {
    try {
      const body = await req.text();
      let keyId, learnerId
      try {
        const json = JSON.parse(body);
        keyId = json.keyId;
        learnerId = json.learnerId
      } catch (parseError) {
        console.error(parseError)
      }
      if (!keyId ) {
        console.error("Missing keyId in request");
        return new Response(JSON.stringify({ error: "Missing keyId in request" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (!learnerId) {
        console.error("Missing learnerId in request");
        return new Response(JSON.stringify({ error: "Missing learnerId in request" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      }
      const provider = new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com");
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      const litNodeClient = new LitNodeClient.LitNodeClientNodeJs({ litNetwork: LIT_NETWORK });
      await litNodeClient.connect();
      console.log("LitNodeClient connected");
      const sessionSigs = await getSessionSigs(litNodeClient, wallet);
      console.log("Session signatures obtained");
      const controllerKeyClaimData = await getControllerKeyClaimData(keyId, learnerId, sessionSigs, litNodeClient, wallet);
      console.log("Key Claim Complete. Returning Key Claim Data", { result: controllerKeyClaimData });
      await litNodeClient.disconnect()
      return new Response(JSON.stringify(controllerKeyClaimData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Unexpected error", { error: error.message, stack: error.stack });
      return new Response(JSON.stringify({ error: "Unexpected error occurred", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    console.log("Method not allowed", { method: req.method });
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


async function getSessionSigs(litNodeClient: any, wallet: ethers.Wallet) {
  const authNeededCallback: AuthCallback = async ({
    uri,
    expiration,
    resourceAbilityRequests,
  }) => {
    if (!uri || !expiration || !resourceAbilityRequests) {
      await litNodeClient.disconnect()
      throw new Error("Missing required parameters");
    }

    const toSign = await createSiweMessageWithRecaps({
      uri: uri,
      expiration: expiration,
      resources: resourceAbilityRequests,
      walletAddress: wallet.address,
      nonce: await litNodeClient.getLatestBlockhash(),
      litNodeClient: litNodeClient,
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

async function getControllerKeyClaimData(keyId: string, learnerId: number, sessionSigs: any, litNodeClient: any, wallet: ethers.Wallet) {
  try {
    const contractClient = new LitContracts({ signer: wallet, network: LIT_NETWORK });
    await contractClient.connect();
    const claimActionRes = await litNodeClient.executeJs({
      sessionSigs,
      code: `(async () => { Lit.Actions.claimKey({keyId}); })();`,
      jsParams: { keyId },
    });

    if (claimActionRes && claimActionRes.claims) {
      const derivedKeyId = claimActionRes.claims[keyId].derivedKeyId;
      const rawControllerClaimKeySigs = claimActionRes.claims[keyId].signatures;

      // Condense signatures
      const condensedSigs = condenseSignatures(rawControllerClaimKeySigs);

      try {
        const publicKey = await contractClient.pubkeyRouterContract.read.getDerivedPubkey(
          contractClient.stakingContract.read.address,
          `0x${derivedKeyId}`
        );

        // Prepare key_claim_data
        const key_claim_data = {
          derivedKeyId,
          condensedSigs
        };

        const { data, error } = await supabaseClient
          .from('sessions')
          .insert({ key_claim_data, request_origin_type: 'learner', learner_id: learnerId })
          .select();

        if (error) {
          console.error('Error updating data in Supabase:', error);
          throw error;
        }
        if (!data || data.length === 0) {
          throw new Error('No data returned after insertion');
        }

        const sessionId = data[0].session_id;

        // Return both the public key and the new session ID to the client
        return { publicKey, sessionId};
      } catch (error) {
        console.error('Detailed error:', {
          message: error.message,
          name: error.name,
          cause: error.cause,
          stack: error.stack,
          ...error
        });
        throw error;
      }
    } else {
      await litNodeClient.disconnect()
      throw new Error("Claim action did not return expected results");
    }
  } catch (error) {
    console.log("Error in getControllerKeyClaimData", { error: error.message, stack: error.stack });
    await litNodeClient.disconnect()
    throw error;
  }
}

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
