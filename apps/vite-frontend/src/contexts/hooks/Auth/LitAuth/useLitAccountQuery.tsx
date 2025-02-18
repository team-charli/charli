// useLitAccountQuery.tsx
import { UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { IRelayPKP } from '@lit-protocol/types';
import { authChainLogger } from '@/App';
import { UnifiedAuth } from '@/types/types';
import { getPKPs, mintPKP, toLitAuthMethod } from '@/utils/lit';

interface LitAccountQueryParams {
  queryKey: [string],
  enabledDeps: boolean,
  queryFnData: UnifiedAuth | null | undefined,
  persister: any
}

export const useLitAccountQuery = ({
  queryKey,
  enabledDeps,
  queryFnData,
  persister
}: LitAccountQueryParams): UseQueryResult<IRelayPKP | null, Error> => {
  const queryClient = useQueryClient();

  return useQuery<IRelayPKP | null, Error>({
    persister,
    queryKey,
    enabled: enabledDeps,
    staleTime: 5 * 60 * 1000,     // 5 minutes
    gcTime: 24 * 60 * 60 * 1000,  // 24 hours
    queryFn: async () => {
      if (!queryFnData) {
        throw new Error('no queryFnData');
      }

      // Convert your UnifiedAuth to a Lit-compatible AuthMethod
      const litAuthMethod = toLitAuthMethod(queryFnData);
      authChainLogger.info('3a: start litAccount query');

      // If somehow litAuthMethod is empty (never should be), return null
      if (!litAuthMethod || !litAuthMethod.accessToken) {
        authChainLogger.info(
          '3b: finish litAccount query -- No authMethod available, returning null'
        );
        return null;
      }

      // Check if we already have a cached litAccount
      const cachedLitAccount = queryClient.getQueryData<IRelayPKP>(queryKey);
      if (cachedLitAccount) {
        authChainLogger.info('3b: finish litAccount query --Using cached LitAccount');
        return cachedLitAccount;
      }

      try {
        authChainLogger.info('Fetching PKPs');
        // Now pass `litAuthMethod` to `getPKPs` (which expects an AuthMethod)
        const myPKPs = await getPKPs(litAuthMethod);

        if (myPKPs.length >= 2) {
          authChainLogger.info(
            '3b: finish litAccount query -- Returning PKP[1]',
            myPKPs[1].tokenId
          );
          return myPKPs[1];
        } else {
          authChainLogger.info('No PKPs found, minting new PKP');
          const newPKP = await mintPKP(litAuthMethod);
          authChainLogger.info('New PKP minted:', !!newPKP);
          authChainLogger.info('3b: finish litAccount query');
          return newPKP;
        }
      } catch (error) {
        console.error('Error in LitAccount query:', error);
        throw error;
      }
    },
  });
};
