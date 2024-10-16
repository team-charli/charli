//useTeacherSignRequestedSessionDuration.tsx
import { SignatureLike, ethers } from 'ethers'
import { useState, useCallback } from 'react'
import { useSignSessionDuration } from '../QueriesMutations/useSignSessionDuration'
import { usePkpWallet } from '@/contexts/AuthContext';

export const useTeacherSignRequestedSessionDuration = () => {
  const [requestedSessionDurationTeacherSig, setRequestedSessionDurationTeacherSig] = useState<SignatureLike>();
  const signDuration = useSignSessionDuration()
  const pkpWallet = usePkpWallet();
  const signSessionDuration = useCallback(async (
    requestedSessionDurationLearnerSig: string | null,
    requestedSessionDuration: number | null,
    hashedLearnerAddress: string | null,
    secureSessionId: string | null
  ) => {
      if (!requestedSessionDurationLearnerSig || requestedSessionDurationLearnerSig.length < 1) throw new Error('requestedSessionDurationLearnerSig undefined')
      if (!requestedSessionDuration) throw new Error('requestedSessionDuration undefined')
      if (!hashedLearnerAddress || hashedLearnerAddress.length < 1) throw new Error('hashedLearnerAddress undefined')
      if (!secureSessionId || secureSessionId.length < 1) throw new Error('secureSessionId undefined')

      const encodedData = ethers.concat([
        ethers.toUtf8Bytes(secureSessionId),
        ethers.toBeHex(BigInt(requestedSessionDuration))
      ]);

      const message = ethers.keccak256(encodedData);

      const recoveredLearnerAddress = ethers.verifyMessage(ethers.getBytes(message), requestedSessionDurationLearnerSig)

      if (hashedLearnerAddress !== ethers.keccak256(recoveredLearnerAddress)) {
        console.error("hashedLearnerAddress", hashedLearnerAddress)
        throw new Error('Invalid learner address')
      }

      try {
        const result = await signDuration.mutateAsync({
          duration: requestedSessionDuration,
          secureSessionId
        });
        setRequestedSessionDurationTeacherSig(result);
        return result;
      } catch (error) {
        console.error('Error signing duration:', error);
        throw error;
      }
    }, [signDuration]);

  return {
    signSessionDuration,
    requestedSessionDurationTeacherSig,
    isLoading: signDuration.isPending,
    isError: signDuration.isError,
    error: signDuration.error,
  };
}
