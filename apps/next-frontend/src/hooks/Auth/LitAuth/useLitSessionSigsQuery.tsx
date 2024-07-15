import { useQuery } from '@tanstack/react-query';
import { useAtom, useSetAtom } from 'jotai';
import {  sessionSigsAtom, sessionSigsErrorAtom } from '@/atoms/atoms';
import { SessionSigs } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { sessionSigsExpired } from '@/utils/app';
import { useLitNodeClientReadyQuery } from './useLitNodeClientReadyQuery';
import { useLitAuthMethodQuery } from './useLitAuthMethodQuery';
import { useLitAccountQuery } from './useLitAccountQuery';

export const useLitSessionSigsQuery = () => {
  const [sessionSigs, setSessionSigs] = useAtom(sessionSigsAtom);
  const setSessionSigsError = useSetAtom(sessionSigsErrorAtom);
  const {data: litNodeClientReady } = useLitNodeClientReadyQuery();
  const {data: authMethod} = useLitAuthMethodQuery();
  const {data: litAccount} = useLitAccountQuery();

  return useQuery<SessionSigs | null >({
    queryKey: ['litSessionSigs', authMethod, litAccount],
    queryFn: async (): Promise<SessionSigs | null> => {

      // console.log('useLitSessionSigsQuery - sessionSigsExpired:', sessionSigsExpired(sessionSigs));
      if (!authMethod || !litAccount) return null;

      if (sessionSigs && !sessionSigsExpired(sessionSigs)) {
        // console.log('Using valid persisted sessionSigs');
        return sessionSigs;
      }
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
