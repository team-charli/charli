// useSignSessionDuration.tsx
import { usePkpWallet } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { ethers } from 'ethers';

export const useSignSessionDuration = () => {
  const { data: pkpWallet } = usePkpWallet();
  return useMutation({
    mutationFn: async ({ duration, secureSessionId }: { duration: number, secureSessionId: string }) => {
      if (!pkpWallet) {
        throw new Error('Wallet not initialized');
      }
      try {
        const encodedData = ethers.concat([
          ethers.toUtf8Bytes(secureSessionId),
          ethers.toBeHex(duration, 32)
        ]);

        const message = ethers.keccak256(encodedData);

        return await pkpWallet.signMessage(ethers.getBytes(message));
      } catch (e) {
        console.error(e);
        throw new Error('Failed to sign session duration');
      }
    }
  });
};
