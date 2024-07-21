import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { supabaseJWTAtom } from '@/atoms/atoms';
import ky from 'ky';
import { IRelayPKP } from '@lit-protocol/types';

interface SupabaseJWTParams {
  queryKey: [string, string],
  enabledDeps: boolean,
  queryFnData: [IRelayPKP | null | undefined, string, string],
  invalidateQueries: () => Promise<string>
}

export const useSupabaseJWTQuery = ({queryKey, enabledDeps, queryFnData, invalidateQueries}: SupabaseJWTParams) => {
  const queryClient = useQueryClient();
  const [currentAccount, nonce, signature] = queryFnData;

  const [supabaseJWT, setSupabaseJWT] = useAtom(supabaseJWTAtom);

  const query = useQuery<string, Error>({
    queryKey,
    queryFn: async (): Promise<string> => {
      console.log("9a: start supabaseJWT query ");

      // If we have a valid JWT after checking, use it
      if (supabaseJWT) {
        console.log("9b: finish supabaseJWT query ");
        return supabaseJWT;
      }

      // If we don't have a valid JWT, fetch a new one
      if (!currentAccount?.ethAddress || !signature || !nonce) {
        throw new Error('9b: finish supabaseJWT query -- Missing required data for JWT fetch');
      }

      const response = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
        json: { ethereumAddress: currentAccount.ethAddress, signature, nonce },
        retry: 3,
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error('9b: finish supabaseJWT query -- Failed to fetch JWT');
      }

      const jwtResponse = await response.json<{ token: string }>();

      if (!jwtResponse.token) {
        throw new Error('9b: finish supabaseJWT query -- JWT token is missing in the response');
      }

      setSupabaseJWT(jwtResponse.token);
      console.log("9b: finish supabaseJWT query ");

      return jwtResponse.token;
    },
    enabled: enabledDeps,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    gcTime: Infinity,
    staleTime: Infinity,
  });

  if (query.isError) {
    console.log("set jwt to null")
    setSupabaseJWT(null);
    queryClient.setQueryData(['supabaseJWT'], null);
  }

  return query;
};
