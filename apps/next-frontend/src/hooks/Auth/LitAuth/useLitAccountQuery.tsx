import { UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '@/utils/lit';

interface LitAccountQueryParams {
  queryKey: [string, boolean],
  enabledDeps: boolean,
  queryFnData: AuthMethod | null | undefined
}

export const useLitAccountQuery = ({queryKey, enabledDeps, queryFnData}: LitAccountQueryParams): UseQueryResult<IRelayPKP | null, Error> => {
  const queryClient = useQueryClient();
  const authMethod = queryFnData;

  return useQuery({
    queryKey,
    queryFn: async (): Promise<IRelayPKP | null> => {
      console.log('LitAccount queryFn called', { authMethod: !!authMethod });

      if (!authMethod) {
        console.log('No authMethod available, returning null');
        return null;
      }

      const cachedLitAccount = queryClient.getQueryData(queryKey) as IRelayPKP | null;
      if (cachedLitAccount) {
        console.log('Using cached LitAccount');
        return cachedLitAccount;
      }

      try {
        console.log('Fetching PKPs');
        const myPKPs = await getPKPs(authMethod);
        console.log(`PKPs fetched, count:`, myPKPs.length);

        if (myPKPs.length) {
          console.log('Returning existing PKP');
          return myPKPs[0];
        } else {
          console.log('No PKPs found, minting new PKP');
          const newPKP = await mintPKP(authMethod);
          console.log('New PKP minted:', !!newPKP);
          return newPKP;
        }
      } catch (error) {
        console.error('Error in LitAccount query:', error);
        throw error;
      }
    },
    enabled: enabledDeps,
    staleTime: 0,  // Consider data immediately stale to allow refetching when needed
    gcTime: 24 * 60 * 60 * 1000,  // Keep unused data for 24 hours
  });
};
