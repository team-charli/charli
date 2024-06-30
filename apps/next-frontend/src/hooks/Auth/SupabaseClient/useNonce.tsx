// useNonce.ts
import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import ky from 'ky';
import { NonceData } from '@/types/types';
import { nonceAtom } from '@/atoms/atoms';

export const useNonce = () => {
  const setNonce = useSetAtom(nonceAtom);

  return useQuery({
    queryKey: ['nonce'],
    queryFn: async (): Promise<string> => {
      const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
      setNonce(nonceResponse.nonce);
      return nonceResponse.nonce;
    },
  });
};
