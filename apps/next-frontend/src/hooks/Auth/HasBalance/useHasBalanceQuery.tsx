// useHasBalance.ts
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { IRelayPKP } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';

interface HasBalanceQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [ PKPEthersWallet | undefined, IRelayPKP | null | undefined];
}

export const useHasBalanceQuery = ({queryKey, enabledDeps, queryFnData}:HasBalanceQueryParams)  => {

  return useQuery({
    queryKey: queryKey,
    queryFn: async (): Promise<boolean | null> => {
      const [pkpWallet, currentAccount] = queryFnData;
      const startTime = Date.now();
      console.log("10a: start hasBalance query");

      if ( !pkpWallet || !currentAccount ) {
        console.log('Dependencies not ready for balance check');
        return null;
      }
      try {
        const balance = await pkpWallet.getBalance();
        const minBalanceWei = ethers.parseEther('0.003259948275487362');
        const hasBalance = balance.gt(minBalanceWei);
        console.log(`10b: hasBalance query finish:`, (Date.now() - startTime) / 1000);

        return hasBalance

      } catch (e) {
        console.error('Error checking balance:', e);
        return false;
      }
    },
    enabled: enabledDeps,
    retry: false,
    staleTime: 30000,
    gcTime: 60000,
  });
};
