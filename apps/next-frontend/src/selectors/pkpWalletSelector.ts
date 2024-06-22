// selectors/pkpWalletSelector.ts
import { selector } from 'recoil';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { litNodeClient } from '@/utils/litClients';
import { currentAccountAtom } from '@/atoms/litAccountAtoms';
import { sessionSigsAtom } from '@/atoms/litSessionAtoms';
import { litNodeClientReadyAtom } from '@/atoms/atoms';

export const pkpWalletSelector = selector<PKPEthersWallet | null>({
  key: 'pkpWalletSelector',
  get: async ({ get }) => {
    const currentAccount = get(currentAccountAtom);
    const sessionSigs = get(sessionSigsAtom);
    const litNodeClientReady = get(litNodeClientReadyAtom);

    if (sessionSigs && currentAccount && litNodeClient?.ready && litNodeClientReady) {
      console.log("Initializing pkpWallet...");
      const wallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: currentAccount.publicKey,
        litNodeClient,
      });

      try {
        await wallet.init();
        return wallet;
      } catch (e) {
        console.error("Error initializing pkpWallet:", e);
        return null;
      }
    } else {
      return null;
    }
  },
});
