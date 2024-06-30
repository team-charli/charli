// usePkpWallet.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { litNodeClient } from '@/utils/litClients';
import { sessionSigsAtom, litAccountAtom, litNodeClientReadyAtom, pkpWalletAtom } from '@/atoms/atoms';

export const usePkpWallet = () => {
  const sessionSigs = useAtomValue(sessionSigsAtom);
  const currentAccount = useAtomValue(litAccountAtom);
  const litNodeClientReady = useAtomValue(litNodeClientReadyAtom);
  const setPkpWallet = useSetAtom(pkpWalletAtom);

  return useQuery({
    queryKey: ['pkpWallet', sessionSigs, currentAccount, litNodeClientReady],
    queryFn: async (): Promise<PKPEthersWallet | null> => {
      if (sessionSigs && currentAccount && litNodeClient?.ready && litNodeClientReady) {
        console.log("Initializing pkpWallet...");
        const wallet = new PKPEthersWallet({
          controllerSessionSigs: sessionSigs,
          pkpPubKey: currentAccount.publicKey,
          litNodeClient,
        });

        await wallet.init();
        setPkpWallet(wallet);
        return wallet;
      }
      return null;
    },
    enabled: !!sessionSigs && !!currentAccount && !!litNodeClientReady,
  });
};
