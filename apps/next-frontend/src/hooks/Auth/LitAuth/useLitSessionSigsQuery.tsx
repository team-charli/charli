import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { sessionSigsAtom, sessionSigsErrorAtom } from '@/atoms/atoms';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { getProviderByAuthMethod } from '@/utils/lit';

export const useLitSessionSigsQuery = (authMethod: AuthMethod | null | undefined, litAccount: IRelayPKP | null | undefined) => {
  const setSessionSigs = useSetAtom(sessionSigsAtom);
  const setSessionSigsError = useSetAtom(sessionSigsErrorAtom);

  return useQuery<SessionSigs | null, Error>({
    queryKey: ['litSession', authMethod, litAccount],
    queryFn: async (): Promise<SessionSigs | null> => {
      if (!authMethod || !litAccount) return null;
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
          return result;
        }
        return null;
      } catch (error) {
        setSessionSigsError(error instanceof Error ? error : new Error('Unknown error getting Lit session'));
        throw error;
      }
    },
    enabled: !!authMethod && !!litAccount,
  });
};
