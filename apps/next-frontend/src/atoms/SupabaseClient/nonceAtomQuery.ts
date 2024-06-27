// atoms/nonceAtom.ts
import { atomWithQuery } from 'jotai-tanstack-query';
import ky from 'ky';
import { NonceData } from '@/types/types';

export const nonceAtom = atomWithQuery(() => ({
  queryKey: ['nonce'],
  queryFn: async (): Promise<string> => {
    const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
    return nonceResponse.nonce;
  },
}));
