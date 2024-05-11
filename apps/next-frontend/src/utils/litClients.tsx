// litClients.ts
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitAuthClient } from '@lit-protocol/lit-auth-client';
import { LIT_NETWORKS_KEYS } from '@lit-protocol/types';

const litNetwork = process.env.NEXT_PUBLIC_LIT_NETWORK_M as LIT_NETWORKS_KEYS;
if (!litNetwork) throw new Error('problem importing litNetwork env')

export const litNodeClient: LitNodeClient = new LitNodeClient({
  alertWhenUnauthorized: false,
  litNetwork,
  checkNodeAttestation: false,
  debug: true
});

export const litAuthClient: LitAuthClient = new LitAuthClient({
  debug: true,
  litRelayConfig: {
    relayApiKey: process.env.NEXT_PUBLIC_LIT_RELAY_API_KEY,
    relayUrl: process.env.NEXT_PUBLIC_LIT_RELAY_URL_M
  },
});



