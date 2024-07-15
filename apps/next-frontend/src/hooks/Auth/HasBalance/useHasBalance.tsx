// useHasBalance.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { ethers } from 'ethers';
import { isOnboardedAtom, pkpWalletAtom, litAccountAtom, hasBalanceAtom } from '@/atoms/atoms';
import { useLitNodeClientReadyQuery } from '../LitAuth/useLitNodeClientReadyQuery';

export const useHasBalance = () => {
  const isOnboarded = useAtomValue(isOnboardedAtom);
  const pkpWallet = useAtomValue(pkpWalletAtom);
  const currentAccount = useAtomValue(litAccountAtom);
  const setHasBalance = useSetAtom(hasBalanceAtom);
  const {data: litNodeClientReady, isSuccess: litNodeClientReadySuccess } = useLitNodeClientReadyQuery();
  return useQuery({
    queryKey: ['hasBalance', litNodeClientReadySuccess ],
    queryFn: async (): Promise<boolean | null> => {
      const startTime = Date.now();
      console.log("10a: start hasBalance query");

      if (!isOnboarded || !pkpWallet || !currentAccount || !litNodeClientReady) {
        console.log('Dependencies not ready for balance check');
        return null;
      }
      try {
        const balance = await pkpWallet.getBalance();
        const minBalanceWei = ethers.parseEther('0.003259948275487362');
        const hasBalance = balance.gt(minBalanceWei);
        setHasBalance(hasBalance);
        console.log(`10b: hasBalance query finish:`, (Date.now() - startTime) / 1000);

        return hasBalance;
      } catch (e) {
        console.error('Error checking balance:', e);
        setHasBalance(false);
        return false;
      }
    },
    enabled: !!isOnboarded && !!pkpWallet && !!currentAccount && !!litNodeClientReady && litNodeClientReadySuccess ,
    retry: false,
    staleTime: 30000,
    gcTime: 60000,
  });
};
