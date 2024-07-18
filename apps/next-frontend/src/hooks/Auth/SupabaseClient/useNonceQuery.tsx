// useNonce.ts
import { UseQueryResult, useQuery } from '@tanstack/react-query';
import ky from 'ky';
import { NonceData } from '@/types/types';

interface NonceQueryParams {
  queryKey: [string],
  enabledDeps: boolean,
}

export const useNonceQuery = ({queryKey, enabledDeps}: NonceQueryParams ): UseQueryResult<string | Error> => {
  return useQuery<string, Error>({
    queryKey,
    queryFn: async () => {
      console.log("5a: start nonce query");
      const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
      console.log(`5b: nonce query finish`);
      return nonceResponse.nonce;
    },
    enabled: enabledDeps,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
