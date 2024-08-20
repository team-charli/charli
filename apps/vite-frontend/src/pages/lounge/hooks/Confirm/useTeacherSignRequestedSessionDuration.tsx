//useTeacherSignRequestedSessionDuration.tsx
import { SignatureLike, ethers } from 'ethers'
import { useEffect, useState, useCallback } from 'react'
import { useSignSessionDuration } from '../QueriesMutations/useSignSessionDuration'

export const useTeacherSignRequestedSessionDuration = () => {
  const [requestedSessionDurationTeacherSig, setRequestedSessionDurationTeacherSig] = useState<SignatureLike>();
  const signDuration = useSignSessionDuration()

  const signSessionDuration = useCallback(async (
    requestedSessionDurationLearnerSig: string | null,
    requestedSessionDuration: string | null,
    hashedLearnerAddress: string | null,
    secureSessionId: string | null
  ) => {
    if (!requestedSessionDurationLearnerSig || requestedSessionDurationLearnerSig.length < 1) throw new Error('requestedSessionDurationLearnerSig undefined')
    if (!requestedSessionDuration || requestedSessionDuration.length < 1) throw new Error('requestedSessionDuration undefined')
    if (!hashedLearnerAddress || hashedLearnerAddress.length < 1) throw new Error('hashedLearnerAddress undefined')
    if (!secureSessionId || secureSessionId.length < 1) throw new Error('secureSessionId undefined')

    const encodedData = ethers.concat([
      ethers.toUtf8Bytes(secureSessionId),
      ethers.toBeHex(parseInt(requestedSessionDuration), 32)
    ]);
    const message = ethers.keccak256(encodedData);
    const recoveredLearnerAddress = ethers.verifyMessage(ethers.getBytes(message), requestedSessionDurationLearnerSig)
    if (hashedLearnerAddress !== ethers.keccak256(recoveredLearnerAddress)) {
      throw new Error('Invalid learner address')
    }

    try {
      const result = await signDuration.mutateAsync({
        duration: parseInt(requestedSessionDuration),
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
