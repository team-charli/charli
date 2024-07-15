import { useQuery } from '@tanstack/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { litAccountAtom, accountsErrorAtom, authMethodAtom } from '@/atoms/atoms';
import { IRelayPKP } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '@/utils/lit';

export const useLitAccountQuery = () => {
  const [litAccount, setLitAccount] = useAtom(litAccountAtom);
  const setAccountsError = useSetAtom(accountsErrorAtom);
  const authMethod = useAtomValue(authMethodAtom);

  return useQuery<IRelayPKP | null, Error>({
    queryKey: ['fetchLitAccounts', authMethod],
    queryFn: async (): Promise<IRelayPKP | null> => {
      const startTime = Date.now();
      // console.log('2a: start litAccounts query')
      if (!authMethod) return null;

      // Check if we already have a litAccount in the persistent atom
      if (litAccount) {
        // console.log('Using persisted litAccount');
        return litAccount;
      }

      try {
        const myPKPs = await getPKPs(authMethod);
        const result = myPKPs.length ? myPKPs[0] : await mintPKP(authMethod);
        if (result) {
          setLitAccount(result);
          // console.log(`2b: fetchLitAccounts finish:`, (Date.now() - startTime) / 1000);
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
