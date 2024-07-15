// usePkpWallet.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { litNodeClient } from '@/utils/litClients';
import { litAccountAtom, pkpWalletAtom, authSigAtom } from '@/atoms/atoms';
import { checkAuthSigExpiration } from '@/utils/app';
import { useLitSessionSigsQuery } from '../LitAuth/useLitSessionSigsQuery';

export const usePkpWallet = () => {
  const authSig = useAtomValue(authSigAtom);
  const currentAccount = useAtomValue(litAccountAtom);
  const setPkpWallet = useSetAtom(pkpWalletAtom);

  // Use the dependency query
  const { data: sessionSigs, isSuccess: isSessionSigsSuccess } = useLitSessionSigsQuery();

  return useQuery({
    queryKey: ['pkpWallet', isSessionSigsSuccess, currentAccount?.publicKey],
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
    enabled: isSessionSigsSuccess && !!sessionSigs && !!authSig && !checkAuthSigExpiration(authSig) && !!currentAccount,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
