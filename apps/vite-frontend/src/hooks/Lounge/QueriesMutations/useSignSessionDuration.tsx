// useSignSessionDuration.tsx
import { usePkpWallet } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";

export const useSignSessionDuration = () => {
  const { data: pkpWallet } = usePkpWallet();

  return useMutation({
    mutationFn: async (duration: number) => {
      if (!pkpWallet) {
        throw new Error('Wallet not initialized');
      }
      try {
        return await pkpWallet.signMessage(String(duration));
      } catch (e) {
        console.error(e);
        throw new Error('Failed to sign session duration');
      }
    }
  });
};
