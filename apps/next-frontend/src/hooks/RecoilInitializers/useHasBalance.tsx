// hooks/useHasBalance.ts
import { useRecoilValue, useRecoilCallback } from 'recoil';
import { hasBalanceSelector } from '@/selectors/hasBalanceSelector';
import { pkpWalletAtom, litNodeClientReadyAtom } from '@/atoms/atoms';
import { currentAccountAtom } from '@/atoms/litAccountAtoms';
import { sessionSigsAtom } from '@/atoms/litSessionAtoms';
import { isOnboardedSelector } from '@/selectors/isOnboardedSelector';

export function useHasBalance() {
  const hasBalance = useRecoilValue(hasBalanceSelector);

  const initializeHasBalance = useRecoilCallback(({ snapshot }) => async () => {
    try {
      const isOnboarded = await snapshot.getPromise(isOnboardedSelector);
      const pkpWallet = await snapshot.getPromise(pkpWalletAtom);
      const currentAccount = await snapshot.getPromise(currentAccountAtom);
      const sessionSigs = await snapshot.getPromise(sessionSigsAtom);
      const litNodeClientReady = await snapshot.getPromise(litNodeClientReadyAtom);

      if (!isOnboarded || !pkpWallet || !currentAccount || !sessionSigs || !litNodeClientReady) {
        console.log('Dependencies not ready for balance check');
        return null;
      }

      const balance = await snapshot.getPromise(hasBalanceSelector);
      console.log('Balance checked:', balance);
      return balance;
    } catch (error) {
      console.error('Error checking balance:', error);
      return null;
    }
  }, []);

  return { hasBalance, initializeHasBalance };
}
