import { atomWithQuery } from 'jotai-tanstack-query';
import { pkpWalletAtom } from '../PkpWallet/pkpWalletAtomQuery';
import { nonceAtom } from './nonceAtomQuery';

export const signatureAtom = atomWithQuery((get) => ({
  queryKey: ['signature', get(pkpWalletAtom), get(nonceAtom)],
  queryFn: async (): Promise<string> => {
    const pkpWallet = get(pkpWalletAtom).data;
    const nonce = get(nonceAtom).data;
    if (!pkpWallet) throw new Error('PKP Wallet not available');
    if (!nonce) throw new Error('Nonce not available');
    return pkpWallet.signMessage(nonce);
  },
  enabled: !!get(pkpWalletAtom).data && !!get(nonceAtom).data,
}));
