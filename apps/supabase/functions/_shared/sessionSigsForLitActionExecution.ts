//_shared/sessionSigsForLitActionExecution.ts
import { LitNodeClientNodeJs } from 'https://esm.sh/@lit-protocol/lit-node-client-nodejs@7';
import {
  LitActionResource,
  createSiweMessageWithRecaps,
  generateAuthSig
} from 'https://esm.sh/@lit-protocol/auth-helpers';
import { LIT_ABILITY } from 'https://esm.sh/@lit-protocol/constants';
import { ethers, HDNodeWallet } from 'https://esm.sh/ethers@5.7.0';
import { AuthCallbackParams } from 'https://esm.sh/@lit-protocol/types';

const ONE_WEEK_FROM_NOW = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

export const sessionSigsForLitActionExecution = async (
  wallet: ethers.Wallet,
  client: LitNodeClientNodeJs
) => {
  return await client.getSessionSigs({
    chain: 'ethereum',
    resourceAbilityRequests: [
      {
        resource: new LitActionResource('*'),
        ability: LIT_ABILITY.LitActionExecution
      }
    ],
    authNeededCallback: async (params: AuthCallbackParams) => {
      const message = await createSiweMessageWithRecaps({
        walletAddress: wallet.address,
        nonce: await client.getLatestBlockhash(),
        litNodeClient: client,
        resources: params.resourceAbilityRequests ?? [],
        expiration: ONE_WEEK_FROM_NOW,
        uri: params.uri!
      });

      return await generateAuthSig({
        signer: wallet as HDNodeWallet,
        toSign: message,
        address: wallet.address
      });
    }
  });
};

