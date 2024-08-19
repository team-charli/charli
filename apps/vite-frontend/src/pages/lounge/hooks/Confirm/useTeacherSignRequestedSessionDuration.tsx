import  { SignatureLike, ethers } from 'ethers'
import { useEffect, useState } from 'react'
import { useSignSessionDuration } from '../QueriesMutations/useSignSessionDuration'

export const useTeacherSignRequestedSessionDuration = (requestedSessionDurationLearnerSig: string | null, requestedSessionDuration: string | null, hashedLearnerAddress: string | null, secureSessionId: string | null
) => {
  const [requestedSessionDurationTeacherSig, setRequestedSessionDurationTeacherSig] = useState<SignatureLike>();

  const signDuration = useSignSessionDuration()

  if (!requestedSessionDurationLearnerSig || requestedSessionDurationLearnerSig.length < 1) throw new Error('requestedSessionDurationLearnerSig undefined')
  if (!requestedSessionDuration || requestedSessionDuration.length < 1)  throw new Error('requestedSessionDuration undefined')
  if (!hashedLearnerAddress || hashedLearnerAddress.length < 1)  throw new Error('hashedLearnerAddress undefined')

  const encodedData = ethers.concat([
    ethers.toUtf8Bytes(secureSessionId!),
    ethers.toBeHex(parseInt(requestedSessionDuration!), 32)
  ]);
  const message = ethers.keccak256(encodedData);
  const recoveredLearnerAddress = ethers.verifyMessage(ethers.getBytes(message), requestedSessionDurationLearnerSig!)
  if (hashedLearnerAddress !== ethers.keccak256(recoveredLearnerAddress)) {
    throw new Error('')
  }

  useEffect(() => {
    if (requestedSessionDuration && secureSessionId) {
      signDuration.mutate({
        duration: parseInt(requestedSessionDuration),
        secureSessionId
      }, {
          onSuccess: (data) => {
            setRequestedSessionDurationTeacherSig(data);
          },
        });
    }
  }, [requestedSessionDuration, secureSessionId, setRequestedSessionDurationTeacherSig]);

  return {
    requestedSessionDurationTeacherSig,
    isLoading: signDuration.isPending,
    isError: signDuration.isError,
    error: signDuration.error,
  };
}

