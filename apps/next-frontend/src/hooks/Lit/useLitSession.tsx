// useLitSession.tsx
import {Wallet} from '@ethersproject/wallet'
import {JsonRpcProvider} from '@ethersproject/providers'
// import {hexlify} from '@ethersproject/bytes'
import { useCallback, useState } from 'react';
import { AuthMethod, SessionSigs } from '@lit-protocol/types';
import { getProviderByAuthMethod } from '../../utils/lit';
import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import { IRelayPKP } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import { litNodeClient } from '@/utils/litClients';

export default function useLitSession() {
  const [sessionSigs, setSessionSigs] = useLocalStorage<SessionSigs>("sessionSigs");
  const [sessionLoading, setLoading] = useState<boolean>(false);
  const [sessionError, setError] = useState<Error>();

  const initSession = useCallback(
    async (authMethod: AuthMethod, pkp: IRelayPKP): Promise<void> => {
      setLoading(true);
      setError(undefined);

      try {
        console.log("run initSession");
        console.log('authMethod', authMethod)
        console.log('pkp', pkp)

        let provider;
        try {
          provider = getProviderByAuthMethod(authMethod);
          if (!provider) {
            throw Error('no provider object');
          }
        } catch (e) {
          console.error('error obtaining provider', e);
        }

        if (provider && !sessionSigs) {
          const privateKey = process.env.NEXT_PUBLIC_LIT_CAPACITY_TOKEN_WALLET_DEV;
          if (!privateKey) throw new Error("problem importing process.env.NEXT_PUBLIC_LIT_CAPACITY_TOKEN_WALLET_DEV;")
          const ethersProvider = new JsonRpcProvider("https://chain-rpc.litprotocol.com/http");
          const walletWithCapacityCredit = new Wallet(privateKey, ethersProvider  );

          const expiration = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 1 week
          const resourceAbilities = [{ resource: new LitActionResource('*'), ability: LitAbility.PKPSigning }];
          const capacityTokenIdStr = process.env.NEXT_PUBLIC_LIT_CAPACITY_TOKEN_ID_STRING_H as string;

          const { capacityDelegationAuthSig } = await litNodeClient.createCapacityDelegationAuthSig({
            // uses: '1',
            dAppOwnerWallet: walletWithCapacityCredit,
            capacityTokenId: capacityTokenIdStr,
            delegateeAddresses: [pkp.ethAddress],
          });

          const sessionSigs: SessionSigs = await provider.getSessionSigs({
            authMethod,
            pkpPublicKey: pkp.publicKey,
            sessionSigsParams: {
              chain: 'ethereum',
              expiration,
              resourceAbilityRequests: resourceAbilities,
              capacityDelegationAuthSig,
            },
            litNodeClient,
          }).catch(error => { console.error(error); throw new Error('error getSessionSigs') });

          console.log(`setting sessionSigs: `, sessionSigs);
          setSessionSigs(sessionSigs);
        }
      } catch (e) {
        const error = e as Error;
        console.error("initSession: error", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    },
    [setSessionSigs]
  );

  return {
    sessionSigs,
    initSession,
    sessionLoading,
    sessionError,
  };
}
