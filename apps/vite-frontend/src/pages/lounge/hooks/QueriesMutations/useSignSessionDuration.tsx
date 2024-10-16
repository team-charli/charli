// useSignSessionDuration.tsx
import { usePkpWallet } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { ethers } from 'ethers';

type SignSessionDurationParams = { duration: number, secureSessionId: string
}
export const useSignSessionDuration = () => {
  const { data: pkpWallet } = usePkpWallet();
  return useMutation({
    mutationFn: async ({ duration, secureSessionId }: SignSessionDurationParams ) => {
      if (!pkpWallet) throw new Error('Wallet not initialized');

      try {
        const encodedData = ethers.concat([
          ethers.toUtf8Bytes(secureSessionId),
          ethers.toBeHex(BigInt(duration))
        ]);

        const message = ethers.keccak256(encodedData);

        const signedDurationAndSecureSessionId =  await pkpWallet.signMessage(ethers.getBytes(message));
        return signedDurationAndSecureSessionId;
      } catch (e) {
        console.error(e);
        throw new Error('Failed to sign session duration');
      }
    },
    retry: 3, // Set the maximum number of retries
    retryDelay: (attemptIndex) => 1000 * 2 ** attemptIndex, // Exponential backoff without unnecessary cap
    onError: (error, variables, context) => {
      console.error("Error in useSignSessionDuration:", error);
    }

  });
};
