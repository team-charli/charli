import { useCallback, useState } from 'react';
import { AuthMethod, SessionSigs } from '@lit-protocol/types';
import { getProviderByAuthMethod } from '../../utils/lit';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { IRelayPKP } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import { sessionSigsExpired } from '@/utils/app';
import { litNodeClient } from '@/utils/litClients';
import AuthMethods from '@/components/Lit/AuthMethods';
import { useLitClientReady } from '@/contexts/LitClientContext';

export default function useLitSession() {
  const { litNodeClientReady } = useLitClientReady();
  const [sessionSigs, setSessionSigs] = useLocalStorage<SessionSigs>("sessionSigs");
  const [sessionLoading, setLoading] = useState<boolean>(false);
  const [sessionError, setError] = useState<Error>();

  const initSession = useCallback(
    async (authMethod: AuthMethod, currentAccount: IRelayPKP): Promise<void> => {
      setLoading(true);
      setError(undefined);

      console.log("useLitSession() called; litNodeClient.ready:", litNodeClient.ready)

      if (!litNodeClientReady ) {
        try {
          await litNodeClient.connect()
          console.log("latest blockhash", await litNodeClient.getLatestBlockhash())
        } catch(e) {
          console.error(e)
        }
      }

      try {
        const provider = getProviderByAuthMethod(authMethod);
        if (!provider) { throw new Error('No provider object'); }
        // console.log(" init session vals", {authMethod: Boolean(authMethod), currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), sessionsSigsExpired: sessionSigsExpired(sessionSigs)})


        if (provider && currentAccount?.publicKey && authMethod && (!sessionSigs|| sessionSigsExpired(sessionSigs))) {
          const resourceAbilityRequests = [
            {
              resource: new LitPKPResource('*'),
              ability: LitAbility.PKPSigning,
            },
            {
              resource: new LitActionResource('*'),
              ability: LitAbility.LitActionExecution,
            },
          ];

          try {
            const sessionSigs: SessionSigs = await litNodeClient.getPkpSessionSigs({
              pkpPublicKey: currentAccount.publicKey,
              authMethods: [authMethod],
              resourceAbilityRequests: resourceAbilityRequests
            });
            if (sessionSigs) {
              console.log(`setting sessionSigs:`, sessionSigs);
              setSessionSigs(sessionSigs);
            } else { console.log("problem getting session sigs", sessionSigs)}
          } catch (error) {
            console.error("Error in litNodeClient.getPkpSessionSigs:", error);
          }
        }
      } catch (error) {
        console.error("initSession error:", error);
        setError(error as Error);
      } finally {
        setLoading(false);
      }
    },
    [setSessionSigs, litNodeClientReady  ]
  );

  return {
    sessionSigs,
    initSession,
    sessionLoading,
    sessionError,
  };
}
