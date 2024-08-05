// usePkpWalletQuery.ts
import { useQuery } from '@tanstack/react-query';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { litNodeClient } from '@/utils/litClients';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { authChainLogger } from '@/pages/_app';

interface PkpWalletQueryParams {
  queryKey: [string],
  enabledDeps: boolean,
  queryFnData: [IRelayPKP | null | undefined,  SessionSigs | null | undefined]
}

export const usePkpWalletQuery = ({queryKey, enabledDeps, queryFnData}: PkpWalletQueryParams ) => {
  const [currentAccount, sessionSigs] = queryFnData;

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PKPEthersWallet> => {
      authChainLogger.info("6a: start pkpWallet query");
      if (!sessionSigs || !currentAccount) {
        throw new Error('6b: finish pkpWallet query -- no sessionSigs or currentAccount');
      }

      let wallet: PKPEthersWallet;
      try {
        wallet = new PKPEthersWallet({
          controllerSessionSigs: sessionSigs,
          pkpPubKey: currentAccount.publicKey,
          litNodeClient,
        });
        await wallet.init();
      } catch (error) {
        console.error("Failed to initialize wallet:", error);
        throw new Error('Failed to initialize wallet: ' + (error as Error).message);
      }

      // Verify wallet state
      if (typeof wallet.signMessage !== 'function') {
        throw new Error('Wallet initialization incomplete: signMessage not available');
      }

      authChainLogger.info("6b: finish pkpWallet query");
      return wallet;
    },
    enabled: enabledDeps,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
