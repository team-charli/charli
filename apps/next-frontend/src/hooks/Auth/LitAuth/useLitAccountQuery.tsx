import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { litAccountAtom, accountsErrorAtom } from '@/atoms/atoms';
import { AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '@/utils/lit';

export const useLitAccountQuery = (authMethod: AuthMethod | null | undefined) => {
  const setLitAccount = useSetAtom(litAccountAtom);
  const setAccountsError = useSetAtom(accountsErrorAtom);

  return useQuery<IRelayPKP | null, Error>({
    queryKey: ['fetchLitAccounts', authMethod],
    queryFn: async (): Promise<IRelayPKP | null> => {
      if (!authMethod) return null;
      try {
        const myPKPs = await getPKPs(authMethod);
        const result = myPKPs.length ? myPKPs[0] : await mintPKP(authMethod);
        if (result) {
          setLitAccount(result);
          return result;
        }
        return null;
      } catch (error) {
        setAccountsError(error instanceof Error ? error : new Error('Unknown error fetching Lit accounts'));
        throw error;
      }
    },
    enabled: !!authMethod,
  });
};
