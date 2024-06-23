// selectors/hasBalanceSelector.ts
import { selector } from 'recoil';
import { ethers } from 'ethers';
import { currentAccountAtom } from '@/atoms/litAccountAtoms';
import { sessionSigsAtom } from '@/atoms/litSessionAtoms';
import { pkpWalletAtom } from '@/atoms/atoms';
import { isOnboardedSelector } from '@/selectors/isOnboardedSelector';

export const hasBalanceSelector = selector<boolean | null>({
  key: 'hasBalanceSelector',
  get: async ({ get }) => {
    const isOnboarded = get(isOnboardedSelector);
    const currentAccount = get(currentAccountAtom);
    const sessionSigs = get(sessionSigsAtom);
    const pkpWallet = get(pkpWalletAtom);

    if (!isOnboarded || !currentAccount || !sessionSigs || !pkpWallet) {
      return null;
    }

    try {
      const balance = await pkpWallet.getBalance(currentAccount.ethAddress);
      const minBalanceWei = ethers.parseEther('0.003259948275487362');
      return balance.gt(minBalanceWei);
    } catch (e) {
      console.error('Error checking balance:', e);
      return null;
    }
  },
});
