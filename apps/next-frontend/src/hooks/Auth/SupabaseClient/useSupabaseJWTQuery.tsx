import { useQuery, useQueryClient } from '@tanstack/react-query';
import ky from 'ky';
import { IRelayPKP } from '@lit-protocol/types';
import { isJwtExpired } from '@/utils/app';

interface SupabaseJWTParams {
  queryKey: [string, string],
  enabledDeps: boolean,
  queryFnData: [IRelayPKP | null | undefined, string, string],
  invalidateQueries: () => Promise<string>
}

export const useSupabaseJWTQuery = ({queryKey, enabledDeps, queryFnData, invalidateQueries}: SupabaseJWTParams) => {
  const queryClient = useQueryClient();
  const [currentAccount, nonce, signature] = queryFnData;

  return useQuery<string | null, Error>({
    queryKey,
    queryFn: async (): Promise<string | null> => {
      console.log("9a: start supabaseJWT query ");

      const cachedJWT = queryClient.getQueryData(queryKey) as string | null;
      if (cachedJWT && !isJwtExpired(cachedJWT)) {
        console.log("9b: finish supabaseJWT query -- using cached JWT");
        return cachedJWT;
      } else if (cachedJWT && isJwtExpired(cachedJWT)) {
        console.log("9b: finish supabaseJWT query -- expired JWT, invalidating");
        await invalidateQueries();
        return null;
      }

      if (!currentAccount?.ethAddress || !signature || !nonce) {
        console.log("9b: finish supabaseJWT query -- Missing required data for JWT fetch");
        return null;
      }

      try {
        const response = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
          json: { ethereumAddress: currentAccount.ethAddress, signature, nonce },
          retry: 3,
          timeout: 10000,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch JWT');
        }

        const jwtResponse = await response.json<{ token: string }>();
        if (!jwtResponse.token) {
          throw new Error('JWT token is missing in the response');
        }

        console.log("9b: finish supabaseJWT query -- new JWT obtained");
        return jwtResponse.token;
      } catch (error) {
        console.error("Error fetching JWT:", error);
        await invalidateQueries();
        return null;
      }
    },
    enabled: enabledDeps,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    gcTime: Infinity,
    staleTime: 5 * 60 * 1000, // 5 minutes, adjust based on your JWT expiration time
  });
};
