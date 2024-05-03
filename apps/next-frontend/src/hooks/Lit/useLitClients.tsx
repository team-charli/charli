// useLitClients.ts
import {Wallet} from '@ethersproject/wallet'
import { LitAuthClient } from '@lit-protocol/lit-auth-client';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { useEffect } from 'react';

const useLitClients = (litNodeClient: LitNodeClient, litAuthClient: LitAuthClient) => {
  useEffect(() => {
      const connectClients = async () => {
        const privateKey = process.env.NEXT_PUBLIC_LIT_CAPACITY_TOKEN_WALLET_M as string;
        const walletWithCapacityCredit = new Wallet(privateKey)

        const capacityTokenIdStr = process.env.NEXT_PUBLIC_LIT_CAPACITY_TOKEN_ID_STRING;

        const { capacityDelegationAuthSig } =
          await litNodeClient.createCapacityDelegationAuthSig({
            uses: '1',
            dAppOwnerWallet: walletWithCapacityCredit,
            capacityTokenId: capacityTokenIdStr,
            delegateeAddresses: [secondWalletPKPInfo.ethAddress],
          });
        await litNodeClient.connect().catch(error => {console.error(error); throw new Error('error litNodeClient.connect error')});
    };
    void (async () => {
      await connectClients().catch(error => {console.error(error); throw new Error('error connectClients()')});
    })();
    return () => {
      void (async () => {
        await litNodeClient.disconnect().catch(error => {console.error(error); throw new Error('error disconnect()')});
      })();
    };
  }, [litNodeClient]);
  return { litNodeClient, litAuthClient };
};

export default useLitClients;
