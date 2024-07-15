// useNonce.ts
import { UseQueryResult, useQuery } from '@tanstack/react-query';
import ky from 'ky';
import { NonceData } from '@/types/types';
import { usePkpWallet } from '../PkpWallet/usePkpWallet';
import { useLitSessionSigsQuery } from '../LitAuth/useLitSessionSigsQuery';
import { sessionSigsExpired } from '@/utils/app';

export const useNonce = (): UseQueryResult<string | Error> => {
  const {data: pkpWallet} = usePkpWallet();
  const {data: sessionSigs} = useLitSessionSigsQuery();
  return useQuery<string, Error>({
    queryKey: ['nonce',],
    queryFn: async () => {
      console.log("5a: start nonce query");
      const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
      console.log(`5b: nonce query finish`);
      return nonceResponse.nonce;
    },
    enabled: !!pkpWallet && !!sessionSigs && !sessionSigsExpired(sessionSigs),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
