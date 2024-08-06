// useSignSessionDuration.tsx
import { usePkpWallet } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";

export const useSignSessionDuration = () => {
  const { data: pkpWallet } = usePkpWallet();

  const mutation = useMutation({
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

  return {
    signSessionDuration: mutation.mutateAsync,
    signature: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};
