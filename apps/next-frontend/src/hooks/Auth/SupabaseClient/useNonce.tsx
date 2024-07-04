// useNonce.ts
import { useQuery } from '@tanstack/react-query';
import { useSetAtom, useAtomValue } from 'jotai';
import ky from 'ky';
import { NonceData } from '@/types/types';
import { nonceAtom, pkpWalletAtom, supabaseJWTAtom } from '@/atoms/atoms';
import { isJwtExpired } from '@/utils/app';

export const useNonce = () => {
  const setNonce = useSetAtom(nonceAtom);
  const pkpWallet = useAtomValue(pkpWalletAtom);
  const existingJWT = useAtomValue(supabaseJWTAtom);

  return useQuery<string, Error>({
    queryKey: ['nonce'],
    queryFn: async () => {
      console.log("5a: start nonce query");
      const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
      setNonce(nonceResponse.nonce);
      console.log(`5b: nonce query finish`);
      return nonceResponse.nonce;
    },
    enabled: !!pkpWallet,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
