// useHasBalance.ts
import { useQuery } from '@tanstack/react-query';
import { JsonRpcProvider, Contract, InterfaceAbi, parseEther } from 'ethers';
import { authChainLogger } from '@/App';
import { usdcABI } from '@/abis/usdcABI';
import { IRelayPKP } from '@lit-protocol/types';

interface HasBalanceQueryParams {
  queryKey: [string, string | undefined ];
  enabledDeps: boolean;
  queryFnData:  IRelayPKP | null | undefined;
}

export const useHasBalanceQuery = ({queryKey, enabledDeps, queryFnData}:HasBalanceQueryParams)  => {

  return useQuery({
    queryKey: queryKey,
    queryFn: async (): Promise<boolean | null> => {
      const currentAccount = queryFnData;
      const startTime = Date.now();
      authChainLogger.info("12a: start hasBalance query");
      if ( !currentAccount ) {
        authChainLogger.info('12b: hasBalance query finish -- Dependencies not ready for balance check');
        authChainLogger.info('12b: hasBalance query finish -- Dependencies not ready for balance check')

        return null;
      }
      try {
        const usdcAddress = import.meta.env.VITE_USDC_SEPOLIA_CONTRACT_ADDRESS;
        const url = import.meta.env.VITE_SEPOLIA_RPC_URL;
        const abi = usdcABI as InterfaceAbi;
        const provider = new JsonRpcProvider(url);
        const usdcContract = new Contract(usdcAddress, abi, provider)
        const balance = await usdcContract.balanceOf(currentAccount.ethAddress);
        const minBalanceWei = parseEther('0.003259948275487362');
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
