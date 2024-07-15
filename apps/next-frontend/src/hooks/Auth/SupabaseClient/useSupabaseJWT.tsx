import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue } from 'jotai';
import { signatureAtom, litAccountAtom, supabaseJWTAtom } from '@/atoms/atoms';
import ky from 'ky';
import { useAuthChainManager } from '../useAuthChainManager';
import { useNonce } from './useNonce';
import { useLitAccountQuery } from '../LitAuth/useLitAccountQuery';
import { useSignature } from './useSignature';
import { useLitAuthMethodQuery } from '../LitAuth/useLitAuthMethodQuery';
import { useLitNodeClientReadyQuery } from '../LitAuth/useLitNodeClientReadyQuery';

export const useSupabaseJWT = () => {
  const queryClient = useQueryClient();
  const {data: currentAccount} = useLitAccountQuery()
  const {data: nonce} = useNonce();
  const {data: signature} = useSignature();
  const {data: litNodeClientReady} = useLitNodeClientReadyQuery();
  const {data: authMethod} = useLitAuthMethodQuery();
  const litAccount = useAtomValue(litAccountAtom);

  const [supabaseJWT, setSupabaseJWT] = useAtom(supabaseJWTAtom);
  const { checkAndInvalidate } = useAuthChainManager();

  const query = useQuery<string, Error>({
    queryKey: ['supabaseJWT', signature],
    queryFn: async (): Promise<string> => {
      console.log("supabaseJWT query run");

      const result = await checkAndInvalidate(litNodeClientReady, authMethod, litAccount, supabaseJWT);
      if (result === 'redirect_to_login') {
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
    console.log("set jwt to null")
    setSupabaseJWT(null);
    queryClient.setQueryData(['supabaseJWT'], null);
  }

  return query;
};
