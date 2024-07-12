import { useQuery } from '@tanstack/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { authMethodAtom, litAccountAtom, litNodeClientReadyAtom, sessionSigsAtom, sessionSigsErrorAtom } from '@/atoms/atoms';
import { SessionSigs } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { getProviderByAuthMethod } from '@/utils/lit';
import { useLitSessionSigsExpirationCheck } from './useLitSessionSigsExpirationCheck';
import { sessionSigsExpired } from '@/utils/app';

export const useLitSessionSigsQuery = () => {
  const [sessionSigs, setSessionSigs] = useAtom(sessionSigsAtom);
  const setSessionSigsError = useSetAtom(sessionSigsErrorAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);
  const authMethod = useAtomValue(authMethodAtom);
  const litAccount = useAtomValue(litAccountAtom);

  return useQuery<SessionSigs | null, Error>({
    queryKey: ['litSessionSigs', authMethod, litAccount],
    queryFn: async (): Promise<SessionSigs | null> => {
      if (!authMethod || !litAccount) return null;

      if (sessionSigs && !sessionSigsExpired(sessionSigs)) {
        console.log('Using valid persisted sessionSigs');
        return sessionSigs;
      }

      console.log('SessionSigs expired or missing, fetching new ones');
      try {
        // Fetch new sessionSigs logic here
        const result = await litNodeClient.getPkpSessionSigs({
          pkpPublicKey: litAccount.publicKey,
          authMethods: [authMethod],
          resourceAbilityRequests: [
            {
              resource: new LitPKPResource('*'),
              ability: LitAbility.PKPSigning,
            },
            {
              resource: new LitActionResource('*'),
              ability: LitAbility.LitActionExecution,
            },
          ]
        });

        if (result) {
          console.log('New sessionSigs obtained');
          setSessionSigs(result);
          return result;
        }
        return null;
      } catch (error) {
        setSessionSigsError(error instanceof Error ? error : new Error('Unknown error getting Lit session'));
        throw error;
      }
    },
    enabled: !!authMethod && !!litAccount && litNodeClientReady,
  });
};
