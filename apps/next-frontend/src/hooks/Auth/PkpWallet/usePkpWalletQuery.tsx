// usePkpWalletQuery.ts
import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { litNodeClient } from '@/utils/litClients';
import { pkpWalletAtom } from '@/atoms/atoms';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';

interface PkpWalletQueryParams {
  queryKey: [string, boolean],
  enabledDeps: boolean,
  queryFnData: [IRelayPKP | null | undefined,  SessionSigs | null | undefined]
}

export const usePkpWalletQuery = ({queryKey, enabledDeps, queryFnData}: PkpWalletQueryParams ) => {
  const [currentAccount, sessionSigs] = queryFnData;
  const setPkpWallet = useSetAtom(pkpWalletAtom);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PKPEthersWallet> => {
      if (!sessionSigs || !currentAccount) throw new Error('no sessionSigs or currentAccount')

      const wallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: currentAccount.publicKey,
        litNodeClient,
      });
      await wallet.init();
      setPkpWallet(wallet);
      return wallet;
    },
    enabled: enabledDeps,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
