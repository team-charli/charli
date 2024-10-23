// useProofSigning.ts
import { useMutation } from '@tanstack/react-query';
import { usePkpWallet } from "@/contexts/AuthContext";
import { SessionDurationData } from '@/types/types';

export const useProofSigning = () => {
  const { data: pkpWallet } = usePkpWallet();

  const signMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!pkpWallet) throw new Error('PKP wallet not available');
      const message = JSON.stringify(data);
      return await pkpWallet.signMessage(message);
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  const createSignature = async (data: SessionDurationData): Promise<string> => {
    return signMutation.mutateAsync(data);
  };

  const createCounterSignature = async (initialProof: SessionDurationData): Promise<string> => {
    return signMutation.mutateAsync(initialProof);
  };

  return {
    createSignature,
    createCounterSignature,
    isSigningLoading: signMutation.isPending
  };
};
