// selectors/signatureSelector.ts
import { selector } from 'recoil';
import { pkpWalletAtom } from '@/atoms/atoms';
import { nonceSelector } from './nonceSelector';

export const signatureSelector = selector<string>({
  key: 'signatureSelector',
  get: async ({ get }) => {
    const pkpWallet = get(pkpWalletAtom);
    const nonce = get(nonceSelector);
    if (!pkpWallet) throw new Error('PKP Wallet not available');
    return pkpWallet.signMessage(nonce);
  },
});

