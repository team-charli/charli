import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { authMethodAtom, litAccountAtom, litNodeClientReadyAtom, sessionSigsAtom, sessionSigsErrorAtom } from '@/atoms/atoms';
import { SessionSigs } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { getProviderByAuthMethod } from '@/utils/lit';
import { sessionSigsExpired } from '@/utils/app';

export const useLitSessionSigsQuery = () => {
  const queryClient = useQueryClient();
  const [sessionSigs, setSessionSigs] = useAtom(sessionSigsAtom);
  const setSessionSigsError = useSetAtom(sessionSigsErrorAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);
  const authMethod = useAtomValue(authMethodAtom);
  const litAccount = useAtomValue(litAccountAtom);

  const query = useQuery<SessionSigs | null, Error>({
    queryKey: ['litSession', authMethod, litAccount],
    queryFn: async (): Promise<SessionSigs | null> => {
      const startTime = Date.now();
      console.log('3a: start sessionSigs query')
      if (!authMethod || !litAccount) return null;

      if (sessionSigs) {
        const isExpired = sessionSigsExpired(sessionSigs);
        if (!isExpired) {
          console.log('Using valid persisted sessionSigs');
          return sessionSigs;
        } else {
          console.log('Persisted sessionSigs are expired, fetching new ones');
        }
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
        localStorage.removeItem('lit-wallet-sig');
        localStorage.removeItem('lit-session-key');
        localStorage.removeItem('sessionSigs');
        //DEBUG: weird bug:  when I run this with expired sigs I get SIWE resource Error.  But when I clear localStorage completely this runs fine.  What is not being cleared and interferring here? Only see tokenId in 'litAccount' but don't see that being checked in pkpWallet or getPkpSessionSigs
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
