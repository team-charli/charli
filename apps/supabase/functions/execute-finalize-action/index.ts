///Users/zm/Projects/charli/apps/supabase/functions/execute-finalize-action/index.ts
import { Hono } from 'jsr:@hono/hono';
import { LitNodeClientNodeJs } from 'https://esm.sh/@lit-protocol/lit-node-client-nodejs@7';
import { AccessControlConditions, ExecuteJsResponse } from 'https://esm.sh/@lit-protocol/types';
import { ethers } from 'https://esm.sh/ethers@5.7.0';

import { corsHeaders } from '../_shared/cors.ts';
import { sessionSigsForDecryptInAction } from '../_shared/generateControllerWalletSessionSig.ts';

const PRIVATE_KEY = Deno.env.get("PRIVATE_KEY_FINALIZE_EDGE") ?? "";
const provider = new ethers.providers.JsonRpcProvider(
  Deno.env.get("PROVIDER_URL") ?? "https://yellowstone-rpc.litprotocol.com"
);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const FINALIZE_LIT_ACTION_IPFS_CID = Deno.env.get('FINALIZE_LIT_ACTION_IPFS_CID') ?? "";

// Optional environment references (customize or remove as needed):
const usdcContractAddress = Deno.env.get('USDC_CONTRACT_ADDRESS_BASE_SEPOLIA');
const relayerIpfsId = Deno.env.get('RELAYER_IPFS_ID');
const env = Deno.env.get('ACTION_ENV');
const rpcChain = Deno.env.get('ACTION_RPC_CHAIN');
const rpcChainId = Deno.env.get('ACTION_RPC_CHAIN_ID');

const functionName = 'execute-finalize-action';
const app = new Hono().basePath(`/${functionName}`);

// ----- MIDDLEWARE -----
app.use('*', async (c, next) => {
  for (const [key, value] of Object.entries(corsHeaders)) {
    c.header(key, value);
  }
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  await next();
});

// ----- MAIN ENDPOINT -----
app.post('/', async (c) => {
  const litNodeClient = new LitNodeClientNodeJs({ litNetwork: 'datil-dev', debug: false });
  console.log('[execute-finalize-action] Starting request...');

  try {
    // 1. Parse incoming body
    const body = await c.req.json();
    console.log('[execute-finalize-action] Body received:', JSON.stringify(body, null, 2));

    const {
      sessionData,
      sessionDataSignature,
      teacherAddressCiphertext,
      teacherAddressEncryptHash,
      learnerAddressCiphertext,
      learnerAddressEncryptHash,
      controllerAddress,
      finalizeEdgeAddress
    } = body;

    if (!sessionData) {
      return c.json({ error: 'Missing sessionData' }, 400, {
        ...corsHeaders,
        'Content-Type': 'application/json'
      });
    }
    if (!sessionDataSignature) {
      return c.json({ error: 'Missing sessionDataSignature' }, 400, {
        ...corsHeaders,
        'Content-Type': 'application/json'
      });
    }

    // 2. Connect to Lit
    console.log('[execute-finalize-action] Connecting to Lit network...');
    await litNodeClient.connect();

    // 3. Build minimal accessControlConditions
    const accessControlConditions: AccessControlConditions = [
        {
          contractAddress: '',
          standardContractType: '',
          chain: "ethereum",
          method: '',
          parameters: ['0x'],
          returnValueTest: {
            comparator: '=',
            value: '0x'
          }
        }
      ]

    // 4. Generate session signature for decryption
    console.log('[execute-finalize-action] Generating session signatures...');
    const sessionSigs = await sessionSigsForDecryptInAction(
      wallet,
      litNodeClient,
      accessControlConditions,
      learnerAddressEncryptHash
    );
    console.log('[execute-finalize-action] Session signatures complete.');

    // 5. Execute Lit Action
    console.log('[execute-finalize-action] Calling Lit Action...');
    // Get relayer PKP info from environment variables
    const relayerPkpTokenId = Deno.env.get('RELAYER_PKP_TOKEN_ID');
    const relayerAddress = Deno.env.get('RELAYER_PKP_ADDRESS');
    const relayerPublicKey = Deno.env.get('RELAYER_PKP_PUBLIC_KEY');
    
    console.log('[execute-finalize-action] Using relayer PKP information:', {
      relayerPkpTokenId,
      relayerAddress,
      relayerPublicKey
    });
    
    const results = await litNodeClient.executeJs({
      ipfsId: FINALIZE_LIT_ACTION_IPFS_CID,
      sessionSigs,
      jsParams: {
        sessionData,
        sessionDataSignature,
        teacherAddressCiphertext,
        teacherAddressEncryptHash,
        learnerAddressCiphertext,
        learnerAddressEncryptHash,
        controllerAddress,
        finalizeEdgeAddress,
        accessControlConditions,
        usdcContractAddress,
        relayerIpfsId,
        env,
        rpcChain,
        rpcChainId,
        // Pass relayer PKP information
        relayerPkpTokenId,
        relayerAddress,
        relayerPublicKey
      }
    });

    // 6. Parse Lit Action response
    const actionResp = JSON.parse(results.response || '{}') as {
      success?: boolean;
      error?: string;
      relayedTxHash?: string;
    };

    if (!actionResp.success) {
      console.error('[execute-finalize-action] Lit Action indicated failure:', actionResp.error);
      return c.json({ error: actionResp.error }, 400, {
        ...corsHeaders,
        'Content-Type': 'application/json'
      });
    }

    if (!actionResp.relayedTxHash) {
      console.error('[execute-finalize-action] No relayedTxHash from Lit Action');
      return c.json({ error: 'No relayedTxHash in Lit Action response' }, 500, {
        ...corsHeaders,
        'Content-Type': 'application/json'
      });
    }

    // 7. Disconnect from Lit
    await litNodeClient.disconnect();

    // 8. Return success
    return c.json({
      transactionHash: actionResp.relayedTxHash
    }, 200, {
      ...corsHeaders,
      'Content-Type': 'application/json'
    });

  } catch (err) {
    console.error('[execute-finalize-action] Unexpected error:', err);
    await litNodeClient.disconnect(); // ensure we always disconnect
    return c.json({ error: String(err) }, 500, {
      ...corsHeaders,
      'Content-Type': 'application/json'
    });
  }
});

// ----- OPTIONS -----
app.options('/', (c) => {
  return c.newResponse(null, 204, corsHeaders);
});

// Use the Hono app with Deno Deploy, preserving your original try/catch pattern:
Deno.serve(async (req) => {
  try {
    return await app.fetch(req);
  } catch (error: unknown) {
    console.error("[execute-finalize-action] Error in request handler:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
