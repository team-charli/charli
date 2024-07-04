import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import ky from 'ky';
import { signatureAtom, litAccountAtom, nonceAtom, supabaseJWTAtom } from '@/atoms/atoms';

export const useSupabaseJWT = () => {
  const queryClient = useQueryClient();
  const signature = useAtomValue(signatureAtom);
  const currentAccount = useAtomValue(litAccountAtom);
  const nonce = useAtomValue(nonceAtom);
  const setSupabaseJWT = useSetAtom(supabaseJWTAtom);

  const query = useQuery<string, Error>({
    queryKey: ['supabaseJWT'],
    queryFn: async (): Promise<string> => {
      console.log('7a: Starting JWT fetch');

      const persistedJWT = localStorage.getItem('supabaseJWT');
      if (persistedJWT) {
        try {
          setSupabaseJWT(persistedJWT);
          return persistedJWT;
        } catch {
          localStorage.removeItem('supabaseJWT');
        }
      }

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
      localStorage.setItem('supabaseJWT', jwtResponse.token);
      return jwtResponse.token;
    },
    enabled: !!signature && !!currentAccount?.ethAddress && !!nonce,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    gcTime: 10 * 60 * 1000,
    staleTime: Infinity,
  });

  if (query.isError) {
    localStorage.removeItem('supabaseJWT');
    queryClient.setQueryData(['supabaseJWT'], null);
  }

  return query;
};
