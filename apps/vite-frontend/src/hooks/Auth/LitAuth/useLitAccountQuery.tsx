//useLitAccountQuery.tsx
import { UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import {  IRelayPKP } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '@/utils/lit';
import { authChainLogger } from '@/App';
import { AuthMethodPlus } from '@/types/types';

interface LitAccountQueryParams {
  queryKey:    [string],
  enabledDeps: boolean,
  queryFnData: AuthMethodPlus | null | undefined,
  persister: any
}

export const useLitAccountQuery = ({queryKey, enabledDeps, queryFnData, persister}: LitAccountQueryParams): UseQueryResult<IRelayPKP | null, Error> => {
  const queryClient = useQueryClient();


  return useQuery({
    queryKey,
    queryFn: async (): Promise<IRelayPKP | null> => {
      // authChainLogger.info('queryFnData', queryFnData)
      if (!queryFnData) throw new Error('no queryFnData')
      const {authMethodType, idToken: accessToken} = queryFnData;
      const authMethod = {authMethodType, accessToken};

      authChainLogger.info('3a: start litAccount query');

      if (!authMethod) {
        authChainLogger.info('3b: finish litAccount query -- No authMethod available, returning null');
        return null;
      }

      const cachedLitAccount = queryClient.getQueryData(queryKey) as IRelayPKP | null;
      if (cachedLitAccount) {
        authChainLogger.info('3b: finish litAccount query --Using cached LitAccount');
        return cachedLitAccount;
      }

      try {
        authChainLogger.info('Fetching PKPs');
        const myPKPs = await getPKPs(authMethod);
        // authChainLogger.info(`PKPs fetched, count:`, myPKPs.length);

        if (myPKPs.length >= 2) {
          // if (myPKPs.length ) {
          // authChainLogger.info('3b: finish litAccount query -- Returning existing PKP');
          authChainLogger.info('3b: finish litAccount query -- Returning PKP[1]', myPKPs[1].tokenId);

          return myPKPs[1];
        } else {
          authChainLogger.info('No PKPs found, minting new PKP');
          const newPKP = await mintPKP(authMethod);
          authChainLogger.info('New PKP minted:', !!newPKP);
          authChainLogger.info('3b: finish litAccount query');

          return newPKP;
        }
      }
      catch (error) {
        console.error('Error in LitAccount query:', error);
        throw error;
      }
    },
    enabled: enabledDeps,
    staleTime: 5 * 60 * 1000, // 5 minutes,
    gcTime: 24 * 60 * 60 * 1000,  // Keep unused data for 24 hours
    persister
  });
};
