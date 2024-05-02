// litClients.ts
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitAuthClient } from '@lit-protocol/lit-auth-client';

export const litNodeClient: LitNodeClient = new LitNodeClient({
  alertWhenUnauthorized: false,
  litNetwork: 'cayenne',
  debug: true,
});

export const litAuthClient: LitAuthClient = new LitAuthClient({
  debug: true,
  litRelayConfig: {
    relayApiKey: "E02B0102-DFF4-67E9-3385-5C71096D7CA0_charli",
  },
  litNodeClient,
});
