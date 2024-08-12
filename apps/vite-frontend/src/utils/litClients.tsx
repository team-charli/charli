'use client'
// litClients.ts
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitAuthClient } from '@lit-protocol/lit-auth-client';
import { LIT_NETWORKS_KEYS } from '@lit-protocol/types';

const litNetwork = import.meta.env.VITE_LIT_NETWORK_C as LIT_NETWORKS_KEYS;
if (!litNetwork) throw new Error('problem importing litNetwork env')

export const litNodeClient: LitNodeClient = new LitNodeClient({
  alertWhenUnauthorized: false,
  litNetwork,
  checkNodeAttestation: false,
  debug: false,
});


export const litAuthClient: LitAuthClient = new LitAuthClient({
   debug: false,
  litRelayConfig: {
    relayApiKey: import.meta.env.VITE_LIT_RELAY_API_KEY,
  },
  litNodeClient,
});
