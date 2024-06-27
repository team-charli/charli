import { atomWithQuery } from 'jotai-tanstack-query';
import ky from 'ky';
import { signatureAtom } from './signatureAtomQuery';
import { fetchLitAccountsAtom } from '../LitAuth/litAccountsAtomQuery';
import { nonceAtom } from './nonceAtomQuery';

export const supabaseJWTAtom = atomWithQuery((get) => ({
  queryKey: ['supabaseJWT', get(signatureAtom), get(fetchLitAccountsAtom), get(nonceAtom)],
  queryFn: async (): Promise<string> => {
    const signature = get(signatureAtom).data;
    const currentAccount = get(fetchLitAccountsAtom).data;
    const nonce = get(nonceAtom).data;

    if (!currentAccount) throw new Error('Current account not available');
    if (!signature) throw new Error('Signature not available');
    if (!nonce) throw new Error('Nonce not available');

    const jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
      json: { ethereumAddress: currentAccount.ethAddress, signature, nonce },
    }).json<{ token: string }>();

    if (!jwtResponse.token) throw new Error('Failed to fetch JWT');
    return jwtResponse.token;
  },
  enabled: !!get(signatureAtom).data && !!get(fetchLitAccountsAtom).data && !!get(nonceAtom).data,
}));
