import { selector } from 'recoil';
import ky from 'ky';
import { NonceData } from '@/types/types';

export const nonceSelector = selector<string>({
  key: 'nonceSelector',
  get: async () => {
    const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
    return nonceResponse.nonce;
  },
});
