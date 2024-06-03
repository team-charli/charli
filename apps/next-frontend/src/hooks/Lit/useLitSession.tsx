import { useCallback, useState } from 'react';
import { AuthMethod, SessionSigs } from '@lit-protocol/types';
import { getProviderByAuthMethod } from '../../utils/lit';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { IRelayPKP } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import { litNodeClient } from '@/utils/litClients';

export default function useLitSession() {
  const [currentAccount] = useLocalStorage<IRelayPKP | null>("currentAccount");
  const [sessionSigs, setSessionSigs] = useLocalStorage<SessionSigs>("sessionSigs");
  const [sessionLoading, setLoading] = useState<boolean>(false);
  const [sessionError, setError] = useState<Error>();

  const initSession = useCallback(
    async (authMethod: AuthMethod, pkp: IRelayPKP): Promise<void> => {
      setLoading(true);
      setError(undefined);

      console.log("latest blockhash", await litNodeClient.getLatestBlockhash())

      try {
        console.log("run initSession");
        console.log('authMethod', authMethod);
        console.log('pkp', pkp);

        const provider = getProviderByAuthMethod(authMethod);
        if (!provider) {
          throw new Error('No provider object');
        }

        if (provider && pkp?.publicKey && authMethod && !sessionSigs) {
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
              pkpPublicKey: pkp.publicKey,
              authMethods: [authMethod],
              resourceAbilityRequests: resourceAbilityRequests
            });
            console.log(`setting sessionSigs:`, sessionSigs);
            setSessionSigs(sessionSigs);
          } catch (error) {
            console.error("Error in litNodeClient.getPkpSessionSigs:", error);
            throw error;
          }
        }
      } catch (error) {
        console.error("initSession error:", error);
        setError(error as Error);
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
