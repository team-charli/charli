import  { SignatureLike, ethers } from 'ethers'
import { useEffect, useState } from 'react'
import { useSignSessionDuration } from '../QueriesMutations/useSignSessionDuration'

export const useTeacherSignRequestedSessionDuration = (requestedSessionDurationLearnerSig: string | null, requestedSessionDuration: string | null, hashedLearnerAddress: string | null) => {
  const [requestedSessionDurationTeacherSig, setRequestedSessionDurationTeacherSig] = useState<SignatureLike>();

  const signDuration = useSignSessionDuration()

  if (!requestedSessionDurationLearnerSig || requestedSessionDurationLearnerSig.length < 1) throw new Error('requestedSessionDurationLearnerSig undefined')
  if (!requestedSessionDuration || requestedSessionDuration.length < 1)  throw new Error('requestedSessionDuration undefined')
  if (!hashedLearnerAddress || hashedLearnerAddress.length < 1)  throw new Error('hashedLearnerAddress undefined')

  const recoveredLearnerAddress = ethers.verifyMessage(String(requestedSessionDuration), requestedSessionDurationLearnerSig)
  if (hashedLearnerAddress !== ethers.keccak256(recoveredLearnerAddress)) {
    throw new Error('')
  }

  useEffect(() => {
    if (requestedSessionDuration) {
      signDuration.mutate(parseInt(requestedSessionDuration), {
        onSuccess: (data) => {
          setRequestedSessionDurationTeacherSig(data);
        },
      });
    }
  }, [requestedSessionDuration, setRequestedSessionDurationTeacherSig]);

  return {
    requestedSessionDurationTeacherSig,
    isLoading: signDuration.isPending,
    isError: signDuration.isError,
    error: signDuration.error,
  };
}

