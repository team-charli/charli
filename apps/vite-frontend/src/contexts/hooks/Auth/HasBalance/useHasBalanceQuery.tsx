// useHasBalance.ts
import { useQuery } from '@tanstack/react-query';
import { JsonRpcProvider, Contract, InterfaceAbi, parseUnits, Network } from 'ethers';
import { authChainLogger } from '@/App';
import { usdc_abi} from '@/abis/usdc_abi';
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
        const usdcAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS_BASE_SEPOLIA;
        const url = import.meta.env.VITE_RPC_URL;
        const chainId = parseInt(import.meta.env.VITE_CHAIN_ID);
        const chainName = import.meta.env.VITE_RPC_CHAIN_NAME;
        const abi = usdc_abi as InterfaceAbi;

        const network = { chainId, name: chainName};
        const provider = new JsonRpcProvider(url, network , { staticNetwork: true });
        const usdcContract = new Contract(usdcAddress, abi, provider);
        const balance = await usdcContract.balanceOf(currentAccount.ethAddress);
        const minBalanceUsdc = parseUnits('9', 6);
        const hasBalance = balance >= minBalanceUsdc;
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
