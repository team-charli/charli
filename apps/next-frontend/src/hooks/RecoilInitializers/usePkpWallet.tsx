// hooks/usePkpWallet.ts
import { useRecoilCallback, useRecoilValue } from 'recoil';
import { pkpWalletSelector } from '@/selectors/pkpWalletSelector';
import { pkpWalletAtom } from '@/atoms/atoms';  // We'll create this

export function usePkpWallet() {
  const pkpWallet = useRecoilValue(pkpWalletAtom);

  const initializePkpWallet = useRecoilCallback(({ snapshot, set }) => async () => {
    try {
      const wallet = await snapshot.getPromise(pkpWalletSelector);
      if (wallet) {
        set(pkpWalletAtom, wallet);
        console.log("PKP Wallet initialized successfully");
      } else {
        console.log("Failed to initialize PKP Wallet");
      }
    } catch (error) {
      console.error("Error initializing PKP Wallet:", error);
    }
  }, []);

  return {
    pkpWallet,
    initializePkpWallet,
  };
}
