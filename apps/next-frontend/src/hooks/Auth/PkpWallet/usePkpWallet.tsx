// usePkpWallet.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { litNodeClient } from '@/utils/litClients';
import { sessionSigsAtom, litAccountAtom, litNodeClientReadyAtom, pkpWalletAtom } from '@/atoms/atoms';
import { useLitSessionSigsExpirationCheck } from '../LitAuth/useLitSessionSigsExpirationCheck';

export const usePkpWallet = () => {
  const sessionSigs = useAtomValue(sessionSigsAtom);
  const currentAccount = useAtomValue(litAccountAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);
  const setPkpWallet = useSetAtom(pkpWalletAtom);
  const sessionSigsExpirationCheck = useLitSessionSigsExpirationCheck();
  const sessionSigsExist = !!sessionSigs;

  return useQuery({
    queryKey: ['pkpWallet', sessionSigsExist, currentAccount?.publicKey, litNodeClientReady, sessionSigsExpirationCheck.data?.status],
    queryFn: async (): Promise<PKPEthersWallet | null> => {
      const startTime = Date.now();
      console.log("4a: start pkpWallet query");

      if (sessionSigsExpirationCheck.data?.status !== 'valid') {
        console.log("Session sigs are not valid, cannot initialize wallet");
        return null;
      }

      if (sessionSigs && currentAccount && litNodeClient?.ready && litNodeClientReady) {
        console.log("Initializing pkpWallet...");
        const wallet = new PKPEthersWallet({
          controllerSessionSigs: sessionSigs,
          pkpPubKey: currentAccount.publicKey,
          litNodeClient,
        });
        await wallet.init();
        setPkpWallet(wallet);
        console.log(`4b: pkp query finish:`, (Date.now() - startTime) / 1000);
        return wallet;
      }
      return null;
    },
    enabled: sessionSigsExpirationCheck.isSuccess && sessionSigsExpirationCheck.data?.status === 'valid' &&
             !!sessionSigs && !!currentAccount && !!litNodeClientReady,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
