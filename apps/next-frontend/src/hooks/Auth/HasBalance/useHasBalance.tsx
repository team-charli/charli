// useHasBalance.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { ethers } from 'ethers';
import { isOnboardedAtom, pkpWalletAtom, litAccountAtom, litNodeClientReadyAtom, hasBalanceAtom } from '@/atoms/atoms';

export const useHasBalance = () => {
  const isOnboarded = useAtomValue(isOnboardedAtom);
  const pkpWallet = useAtomValue(pkpWalletAtom);
  const currentAccount = useAtomValue(litAccountAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);
  const setHasBalance = useSetAtom(hasBalanceAtom);

  return useQuery({
    queryKey: ['hasBalance', isOnboarded, pkpWallet, currentAccount, litNodeClientReady],
    queryFn: async (): Promise<boolean | null> => {
      if (!isOnboarded || !pkpWallet || !currentAccount || !litNodeClientReady) {
        console.log('Dependencies not ready for balance check');
        return null;
      }

      try {
        const balance = await pkpWallet.getBalance(currentAccount.ethAddress);
        const minBalanceWei = ethers.parseEther('0.003259948275487362');
        const hasBalance = balance.gt(minBalanceWei);
        setHasBalance(hasBalance);
        return hasBalance;
      } catch (e) {
        console.error('Error checking balance:', e);
        return null;
      }
    },
    enabled: !!isOnboarded && !!pkpWallet && !!currentAccount && !!litNodeClientReady,
  });
};
