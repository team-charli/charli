// useSupabaseJWT.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import ky from 'ky';
import { signatureAtom, litAccountAtom, nonceAtom, supabaseJWTAtom } from '@/atoms/atoms';

export const useSupabaseJWT = () => {
  const signature = useAtomValue(signatureAtom);
  const currentAccount = useAtomValue(litAccountAtom);
  const nonce = useAtomValue(nonceAtom);
  const setSupabaseJWT = useSetAtom(supabaseJWTAtom);

  return useQuery({
    queryKey: ['supabaseJWT', signature, currentAccount, nonce],
    queryFn: async (): Promise<string> => {
      if (!currentAccount) throw new Error('Current account not available');
      if (!signature) throw new Error('Signature not available');
      if (!nonce) throw new Error('Nonce not available');

      const jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
        json: { ethereumAddress: currentAccount.ethAddress, signature, nonce },
      }).json<{ token: string }>();

      if (!jwtResponse.token) throw new Error('Failed to fetch JWT');
      setSupabaseJWT(jwtResponse.token);
      return jwtResponse.token;
    },
    enabled: !!signature && !!currentAccount && !!nonce,
  });
};
