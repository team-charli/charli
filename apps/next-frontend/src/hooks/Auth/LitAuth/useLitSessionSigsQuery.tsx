import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { litNodeClientReadyAtom, sessionSigsAtom, sessionSigsErrorAtom } from '@/atoms/atoms';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { getProviderByAuthMethod } from '@/utils/lit';

export const useLitSessionSigsQuery = (authMethod: AuthMethod | null | undefined, litAccount: IRelayPKP | null | undefined) => {
  const queryClient = useQueryClient();
  const [sessionSigs, setSessionSigs] = useAtom(sessionSigsAtom);
  const setSessionSigsError = useSetAtom(sessionSigsErrorAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);

  const query = useQuery<SessionSigs | null, Error>({
    queryKey: ['litSession', authMethod, litAccount],
    queryFn: async (): Promise<SessionSigs | null> => {
      const startTime = Date.now();
      console.log('3a: start sessionSigs query')
      if (!authMethod || !litAccount) return null;

      if (sessionSigs) {
        console.log('Using persisted sessionSigs');
        return sessionSigs;
      }

      try {
        if (!litNodeClient.ready) {
          await litNodeClient.connect();
        }
        const provider = getProviderByAuthMethod(authMethod);
        if (!provider) return null;
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
        const result = await litNodeClient.getPkpSessionSigs({
          pkpPublicKey: litAccount.publicKey,
          authMethods: [authMethod],
          resourceAbilityRequests: resourceAbilityRequests
        });
        if (result) {
          console.log('hasSessionSigs')
          setSessionSigs(result);
          console.log(`3b sessionSigs finish:`, (Date.now() - startTime) / 1000);
          return result;
        }
        return null;
      } catch (error) {
        setSessionSigsError(error instanceof Error ? error : new Error('Unknown error getting Lit session'));
        throw error;
      }
    },
    enabled: !!authMethod && !!litAccount && litNodeClientReady,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (query.isError) {
    setSessionSigsError(query.error);
    setSessionSigs(null);
    queryClient.setQueryData(['litSession', authMethod, litAccount], null);
  }

  return query;
};
