import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '@/utils/lit';

interface LitAccountQueryParams {
  queryKey: [string, boolean],
  enabledDeps: boolean,
  queryFnData: AuthMethod | null | undefined
}

export const useLitAccountQuery = ({queryKey, enabledDeps, queryFnData}: LitAccountQueryParams)   => {
  const queryClient = useQueryClient();
  const authMethod = queryFnData;
  return useQuery<IRelayPKP | null, Error>({
    queryKey,
    queryFn: async (): Promise<IRelayPKP | null> => {
      // const startTime = Date.now();
      // console.log('2a: start litAccounts query')
      if (!authMethod) return null;
      const myPKPs = await getPKPs(authMethod);
      // console.log(`2b: fetchLitAccounts finish:`, (Date.now() - startTime) / 1000);

      return myPKPs.length ? myPKPs[0] : await mintPKP(authMethod);
    },

    initialData: () => {
      // Try to get the data from the query cache
      const cachedData = queryClient.getQueryData(queryKey) as IRelayPKP | null;
      if (cachedData) {
        console.log('Using cached litAccount');
        return cachedData;
      }
      return null;
    },

    enabled: enabledDeps
  });
};
