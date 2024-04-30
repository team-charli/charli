// useLitSession.tsx
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { AuthMethod, SessionSigs } from '@lit-protocol/types';
import { getProviderByAuthMethod } from '../../utils/lit';
import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import { IRelayPKP } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import { litNodeClient } from '@/utils/litClients';

export default function useLitSession() {
  const router = useRouter();
  const [sessionSigs, setSessionSigs] = useLocalStorage<SessionSigs>("sessionSigs");
  const [sessionLoading, setLoading] = useState<boolean>(false);
  const [sessionError, setError] = useState<Error>();

  const initSession = useCallback(
    async (authMethod: AuthMethod, pkp: IRelayPKP): Promise<void> => {
      console.log('run initSession');
      setLoading(true);
      setError(undefined);
      try {
        const resourceAbilities = [{ resource: new LitActionResource('*'), ability: LitAbility.PKPSigning }];
        const expiration = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 1 week
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
          const sessionSigs: SessionSigs = await provider.getSessionSigs({
            authMethod,
            pkpPublicKey: pkp.publicKey,
            sessionSigsParams: {
              chain: 'ethereum',
              expiration,
              resourceAbilityRequests: resourceAbilities,
            },
            litNodeClient,
          });
          console.log(`setting sessionSigs: `, sessionSigs);
          setSessionSigs(sessionSigs);
        }
      } catch (e) {
        const error = e as Error;
        console.error("initSession: stack", error.stack);
        console.error("initSession: error", error);
        setError(error);
      } finally {
        setLoading(false);
        await router.push('/onboard');
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
