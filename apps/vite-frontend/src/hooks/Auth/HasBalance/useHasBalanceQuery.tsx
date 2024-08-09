// useHasBalance.ts
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { IRelayPKP } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { authChainLogger } from '@/App';

interface HasBalanceQueryParams {
  queryKey: [string, string | undefined ];
  enabledDeps: boolean;
  queryFnData: [ PKPEthersWallet | undefined, IRelayPKP | null | undefined];
}

export const useHasBalanceQuery = ({queryKey, enabledDeps, queryFnData}:HasBalanceQueryParams)  => {

  return useQuery({
    queryKey: queryKey,
    queryFn: async (): Promise<boolean | null> => {
      const [pkpWallet, currentAccount] = queryFnData;
      const startTime = Date.now();
      authChainLogger.info("12a: start hasBalance query");
      if ( !pkpWallet || !currentAccount ) {
        authChainLogger.info('12b: hasBalance query finish -- Dependencies not ready for balance check');
        authChainLogger.info('12b: hasBalance query finish -- Dependencies not ready for balance check')

        return null;
      }
      try {
        const balance = await pkpWallet.getBalance();
        const minBalanceWei = ethers.parseEther('0.003259948275487362');
        const hasBalance = balance.gt(minBalanceWei);
        authChainLogger.info(`12b: hasBalance query finish:`, (Date.now() - startTime) / 1000);
        authChainLogger.info(`12b: hasBalance query finish:`, (Date.now() - startTime) / 1000);

        return hasBalance

      } catch (e) {
        console.error('12b: hasBalance query finish -- Error checking balance:', e);
        return false;
      }
    },
    enabled: enabledDeps,
    retry: false,
    staleTime: 30000,
    gcTime: 60000,
  });
};
