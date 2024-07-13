import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { signatureAtom, litAccountAtom, nonceAtom } from '@/atoms/atoms';
import ky from 'ky';
import { useAuthChainManager } from '../useAuthChainManager';

export const supabaseJWTAtom = atomWithStorage<string | null>('supabaseJWT', null);

export const useSupabaseJWT = () => {
  const queryClient = useQueryClient();
  const signature = useAtomValue(signatureAtom);
  const currentAccount = useAtomValue(litAccountAtom);
  const nonce = useAtomValue(nonceAtom);
  const [supabaseJWT, setSupabaseJWT] = useAtom(supabaseJWTAtom);
  const { checkAndInvalidate } = useAuthChainManager();

  const query = useQuery<string, Error>({
    queryKey: ['supabaseJWT', signature],
    queryFn: async (): Promise<string> => {
      // Always check the authentication chain, including JWT expiration
      const authStatus = await checkAndInvalidate();
      if (authStatus === 'redirect_to_login') {
        throw new Error('Authentication required');
      }

      // If we have a valid JWT after checking, use it
      if (supabaseJWT) {
        return supabaseJWT;
      }

      // If we don't have a valid JWT, fetch a new one
      if (!currentAccount?.ethAddress || !signature || !nonce) {
        throw new Error('Missing required data for JWT fetch');
      }

      const response = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
        json: { ethereumAddress: currentAccount.ethAddress, signature, nonce },
        retry: 3,
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch JWT');
      }

      const jwtResponse = await response.json<{ token: string }>();
      console.log('7b: JWT response received');

      if (!jwtResponse.token) {
        throw new Error('JWT token is missing in the response');
      }

      setSupabaseJWT(jwtResponse.token);
      return jwtResponse.token;
    },
    enabled: !!signature && !!currentAccount?.ethAddress && !!nonce,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    gcTime: Infinity,
    staleTime: Infinity,
  });

  if (query.isError) {
    setSupabaseJWT(null);
    queryClient.setQueryData(['supabaseJWT'], null);
  }

  return query;
};
