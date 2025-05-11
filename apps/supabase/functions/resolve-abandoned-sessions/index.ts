// functions/resolveAbandonedSessions.ts
import { Hono } from 'jsr:@hono/hono'
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ethers } from 'https://esm.sh/ethers@5.7.0'
import { LitNodeClientNodeJs } from 'https://esm.sh/@lit-protocol/lit-node-client-nodejs@7';
import {createSiweMessageWithRecaps} from 'https://esm.sh/@lit-protocol/auth-helpers@6'

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
    } = session;

    const learnerAddress = user_data.user_address;
    const retrieved_timestamp = new Date().toISOString();
    const toSign = {
      hashed_learner_address,
      hashed_teacher_address,
      confirmed_time_date,
      retrieved_timestamp,
    };
    const worker_signature = await wallet.signMessage(JSON.stringify(toSign));
    const ipfsData = { ...toSign, worker_signature };

    await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecret,
      },
      body: JSON.stringify(ipfsData),
    });

    const sessionSigs = await getSessionSigs(lit, wallet);

    const litResult = await lit.executeJs({
      ipfsId,
      sessionSigs,
      jsParams: {
        learnerAddress,
        controllerAddress: controller_address,
        controllerPublicKey: controller_public_key,
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
    if (!uri || !expiration || !resourceAbilityRequests) {
      throw new Error('Missing required parameters');
    }

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
        ability: 1, // LitAbility.LitActionExecution
      },
    ],
    authNeededCallback,
  });
}

export default app;
