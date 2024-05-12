// litClients.ts
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitAuthClient } from '@lit-protocol/lit-auth-client';
import { LIT_NETWORKS_KEYS } from '@lit-protocol/types';

const litNetwork = process.env.NEXT_PUBLIC_LIT_NETWORK_M as LIT_NETWORKS_KEYS;
const relayUrl = process.env.NEXT_PUBLIC_LIT_RELAY_URL_M;

export const litNodeClient: LitNodeClient = new LitNodeClient({
  alertWhenUnauthorized: false,
  litNetwork,
  checkNodeAttestation: false,
  debug: true
});

console.log('litNetwork', litNetwork, typeof litNetwork)
console.log('relayUrl', relayUrl, typeof relayUrl)
export const litAuthClient: LitAuthClient = new LitAuthClient({
  debug: true,
  litRelayConfig: {
    relayApiKey: process.env.NEXT_PUBLIC_LIT_RELAY_API_KEY,
    relayUrl
  },
});



