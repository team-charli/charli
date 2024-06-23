// selectors/supabaseJWTSelector.ts
import { selector } from 'recoil';
import ky from 'ky';
import { currentAccountAtom } from '@/atoms/litAccountAtoms';
import { signatureSelector } from './signatureSelector';
import { nonceSelector } from './nonceSelector';

export const supabaseJWTSelector = selector<string>({
  key: 'supabaseJWTSelector',
  get: async ({ get }) => {
    const currentAccount = get(currentAccountAtom);
    const signature = get(signatureSelector);
    const nonce = get(nonceSelector);

    if (!currentAccount) throw new Error('Current account not available');

    const jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
      json: { ethereumAddress: currentAccount.ethAddress, signature, nonce },
    }).json<{ token: string }>();

    if (!jwtResponse.token) throw new Error('Failed to fetch JWT');

    return jwtResponse.token;
  },
});
