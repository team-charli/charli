// functions/resolveAbandonedSessions.ts
import { Hono } from 'jsr:@hono/hono';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ethers } from 'https://esm.sh/ethers@5.7.0';
import { JsonRpcProvider } from 'https://esm.sh/@ethersproject/providers';
import { LitNodeClientNodeJs } from 'https://esm.sh/@lit-protocol/lit-node-client-nodejs@7';
import { createSiweMessageWithRecaps } from 'https://esm.sh/@lit-protocol/auth-helpers@6';

const app = new Hono();

// ----- helpers -----
const pinJson = async (pinataApiKey: string, pinataSecretApiKey: string, payload: unknown) => {
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretApiKey
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Pinata upload failed: ${await res.text()}`);
  const { IpfsHash } = await res.json();
  return IpfsHash as string;
};

const getSessionSigs = async (
  lit: LitNodeClientNodeJs,
  wallet: ethers.Wallet,
  ability = 1
) => {
  const authNeededCallback = async ({
    uri,
    expiration,
    resourceAbilityRequests
  }: any) => {
    const toSign = await createSiweMessageWithRecaps({
      uri,
      expiration,
      resources: resourceAbilityRequests,
      walletAddress: wallet.address,
      nonce: await lit.getLatestBlockhash(),
      litNodeClient: lit
    });
    const sig = await wallet.signMessage(toSign);
    return {
      sig,
      derivedVia: 'web3.eth.personal.sign',
      signedMessage: toSign,
      address: wallet.address
    };
  };

  return await lit.getSessionSigs({
    chain: 'ethereum',
    resourceAbilityRequests: [
      { resource: { baseUrl: '*', path: '', orgId: '' }, ability }
    ],
    authNeededCallback
  });
};

// ----- main handler -----
app.get('/', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const nowIso = new Date().toISOString();
  const { data: sessions, error: selErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_resolved', false)
    .lte('confirmed_time_date', nowIso);

  if (selErr) return c.text('DB query error', 500);

  // env
  const providerUrl = Deno.env.get('PROVIDER_URL')!;
  const privateKey = Deno.env.get('DEV_PRIVATE_KEY')!;
  const litNetwork = Deno.env.get('LIT_NETWORK')!;
  const ipfsId = Deno.env.get('IPFS_ID')!;
  const pinataApiKey = Deno.env.get('PINATA_API_KEY')!;
  const pinataSecret = Deno.env.get('PINATA_API_SECRET')!;
  const usdcContractAddress = Deno.env.get('USDC_CONTRACT_ADDRESS')!;
  const chain = Deno.env.get('CHAIN')!;
  const chainId = Deno.env.get('CHAIN_ID')!;
  const relayerIpfsId = Deno.env.get('RELAYER_IPFS_ID')!;

  const provider = new JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const lit = new LitNodeClientNodeJs({ network: litNetwork });
  await lit.connect();

  for (const s of sessions ?? []) {
    const {
      id: session_id,
      controller_address,
      controller_public_key,
      confirmed_time_date,
      requested_session_duration,
      user_data,
      refund_amount
    } = s;

    const learner_address = user_data.user_address;
    const scenario = 'abandoned_refund';

    // ---------- 1. build & pin pre-action record ----------
    const prePayload = {
      session_id,
      learner_address,
      controller_address,
      controller_public_key,
      confirmed_time_date,
      requested_session_duration,
      scenario,
      logic_notes: [
        'session_resolved false',
        'deadline passed',
        'initiating refund'
      ],
      timestamp: Date.now()
    };

    let preCid: string;
    try {
      preCid = await pinJson(pinataApiKey, pinataSecret, prePayload);
    } catch (e) {
      console.error('[pin prePayload]', e);
      continue; // skip this session; try again next run
    }

    // ---------- 2. execute Lit refund action ----------
    let txHash: string | null = null;
    let litSuccess = false;
    try {
      const sessionSigs = await getSessionSigs(lit, wallet);
      // Get relayer PKP info from environment variables
      const relayerPkpTokenId = Deno.env.get('RELAYER_PKP_TOKEN_ID')!;
      const relayerAddress = Deno.env.get('RELAYER_PKP_ADDRESS')!;
      const relayerPublicKey = Deno.env.get('RELAYER_PKP_PUBLIC_KEY')!;
      
      const litRes = await lit.executeJs({
        ipfsId,
        sessionSigs,
        jsParams: {
          learnerAddress: learner_address,
          refundAmount: refund_amount,
          usdcContractAddress,
          controllerAddress: controller_address,
          controllerPubKey: controller_public_key,
          signedReason: JSON.stringify(prePayload),
          ipfsCid: preCid,
          chain,
          chainId,
          relayerIpfsId,
          // Pass relayer PKP information
          relayerPkpTokenId,
          relayerAddress,
          relayerPublicKey
        }
      });

      const parsed = litRes?.response ? JSON.parse(litRes.response) : {};
      if (parsed.success && parsed.relayedTxHash) {
        litSuccess = true;
        txHash = parsed.relayedTxHash;
      }
    } catch (e) {
      console.error('[lit execute]', e);
    }

    // ---------- 3. pin final receipt (success or fail) ----------
    const finalPayload = {
      ...prePayload,
      txHash,
      refund_success: litSuccess,
      pinnedAt: Date.now()
    };

    let finalCid: string;
    try {
      finalCid = await pinJson(pinataApiKey, pinataSecret, finalPayload);
    } catch (e) {
      console.error('[pin finalPayload]', e);
      continue;
    }

    // ---------- 4. update DB ----------
    await supabase
      .from('sessions')
      .update({
        session_resolved: true,
        finalized_ipfs_cid: finalCid
      })
      .eq('id', session_id);
  }

  await lit.disconnect();
  return c.text('resolve-abandoned-sessions complete');
});

export default app;
