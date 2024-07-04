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
    queryKey: ['pkpWallet'],
    queryFn: async (): Promise<PKPEthersWallet | null> => {
      const startTime = Date.now();
      console.log("4a: start pkpWallet query");

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
    enabled: !!sessionSigs && !!currentAccount && !!litNodeClientReady,
  });
};
