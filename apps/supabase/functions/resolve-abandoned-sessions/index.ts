// functions/resolveAbandonedSessions.ts
import { Hono } from 'jsr:@hono/hono'
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ethers } from 'https://esm.sh/ethers@5.7.0'
import { LitNodeClientNodeJs } from 'https://esm.sh/@lit-protocol/lit-node-client-nodejs@7';
import { createSiweMessageWithRecaps } from 'https://esm.sh/@lit-protocol/auth-helpers@6'
import { JsonRpcProvider } from 'https://esm.sh/@ethersproject/providers';

const app = new Hono();

app.get('/', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      sessions.*,
      user_data:user_address!inner(user_address)
    `)
    .eq('session_resolved', false)
    .gte('confirmed_time_date', now);

  if (error) {
    console.error('Failed to fetch sessions:', error);
    return c.text('DB error', 500);
  }

  const providerUrl = Deno.env.get('PROVIDER_URL')!;
  const privateKey = Deno.env.get('DEV_PRIVATE_KEY')!;
  const litNetwork = Deno.env.get('LIT_NETWORK')!;
  const ipfsId = Deno.env.get('IPFS_ID')!;
  const pinataApiKey = Deno.env.get('PINATA_API_KEY')!;
  const pinataSecret = Deno.env.get('PINATA_API_SECRET')!;
  const domain = Deno.env.get('DOMAIN')!;
  const origin = Deno.env.get('ORIGIN')!;
  const usdcContractAddress = Deno.env.get('USDC_CONTRACT_ADDRESS')!;
  const chain = Deno.env.get('CHAIN')!;
  const chainId = Deno.env.get('CHAIN_ID')!;
  const relayerIpfsId = Deno.env.get('RELAYER_IPFS_ID')!;

  const provider = new JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const lit = new LitNodeClientNodeJs({ network: litNetwork });
  await lit.connect();

  for (const session of data ?? []) {
    const {
      controller_public_key,
      controller_address,
      confirmed_time_date,
      hashed_learner_address,
      hashed_teacher_address,
      user_data,
      refund_amount
    } = session;

    const learnerAddress = user_data.user_address;
    const retrieved_timestamp = new Date().toISOString();

    const reasonPayload = {
      hashed_learner_address,
      hashed_teacher_address,
      confirmed_time_date,
      retrieved_timestamp
    };
    const worker_signature = await wallet.signMessage(JSON.stringify(reasonPayload));
    const signedReason = JSON.stringify({ ...reasonPayload, worker_signature });

    const sessionSigs = await getSessionSigs(lit, wallet);

    const litResult = await lit.executeJs({
      ipfsId,
      sessionSigs,
      jsParams: {
        learnerAddress,
        refundAmount: refund_amount, // number
        usdcContractAddress,
        controllerAddress: controller_address,
        controllerPubKey: controller_public_key,
        signedReason,
        chain,
        chainId,
        relayerIpfsId,
      },
    });

    console.log('Lit Action Result:', litResult);
  }

  return c.text('Completed successfully');
});

async function getSessionSigs(lit: LitNodeClientNodeJs, wallet: ethers.Wallet) {
  const authNeededCallback = async ({
    uri,
    expiration,
    resourceAbilityRequests,
  }: {
    uri: string
    expiration: string
    resourceAbilityRequests: any[]
  }) => {
    const toSign = await createSiweMessageWithRecaps({
      uri,
      expiration,
      resources: resourceAbilityRequests,
      walletAddress: wallet.address,
      nonce: await lit.getLatestBlockhash(),
      litNodeClient: lit,
    });

    const signature = await wallet.signMessage(toSign);
    return {
      sig: signature,
      derivedVia: 'web3.eth.personal.sign',
      signedMessage: toSign,
      address: wallet.address,
    };
  };

  return await lit.getSessionSigs({
    chain: 'ethereum',
    resourceAbilityRequests: [
      {
        resource: { baseUrl: '*', path: '', orgId: '' },
        ability: 1,
      },
    ],
    authNeededCallback,
  });
}

export default app;
