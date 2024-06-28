import { atomWithQuery } from 'jotai-tanstack-query';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { litNodeClient } from '@/utils/litClients';
import { litSessionAtom } from '../Lit/sessionSigsAtomQuery';
import { fetchLitAccountsAtom } from '../Lit/litAccountsAtomQuery';
import { litNodeClientReadyAtom } from '../Lit/litNodeClientReadyAtomQuery';

export const pkpWalletAtom = atomWithQuery((get) => ({
  queryKey: ['pkpWallet', get(litSessionAtom), get(fetchLitAccountsAtom), get(litNodeClientReadyAtom)],
  queryFn: async (): Promise<PKPEthersWallet | null> => {
    const sessionSigs = get(litSessionAtom).data;
    const currentAccount = get(fetchLitAccountsAtom).data;
    const litNodeClientReady = get(litNodeClientReadyAtom);

    if (sessionSigs && currentAccount && litNodeClient?.ready && litNodeClientReady) {
      console.log("Initializing pkpWallet...");
      const wallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: currentAccount.publicKey,
        litNodeClient,
      });

      await wallet.init();
      return wallet;
    }
    return null;
  },
  enabled: !!get(litSessionAtom).data && !!get(fetchLitAccountsAtom).data && !!get(litNodeClientReadyAtom),
}));
