//useTeacherSignRequestedSessionDuration.tsx
import { SignatureLike, ethers } from 'ethers'
import { useState, useCallback } from 'react'
import { useSignSessionDuration } from '../QueriesMutations/useSignSessionDuration'
import { usePkpWallet } from '@/contexts/AuthContext';

export const useTeacherSignRequestedSessionDuration = () => {
  const [requestedSessionDurationTeacherSig, setRequestedSessionDurationTeacherSig] = useState<SignatureLike>();
  const signDuration = useSignSessionDuration()
  const {data: pkpWallet} = usePkpWallet();
  const signSessionDuration = useCallback(async (
    sessionDurationData: string,                // hashed message from DB
    requestedSessionDurationLearnerSig: string, // learner sig on that message
    hashedLearnerAddress: string                // DB-stored keccak(learnerAddress)
 ) => {
    if (!pkpWallet) throw new Error('Teacher’s PKP Wallet not initialized');
    if (!sessionDurationData) throw new Error('sessionDurationData is missing');
    if (!requestedSessionDurationLearnerSig) throw new Error('No learner sig provided');
    if (!hashedLearnerAddress) throw new Error('No hashed learner address');

    // 1. Recover the Learner’s address from the DB’s hashed message
    const recoveredLearnerAddress = ethers.verifyMessage(
      ethers.getBytes(sessionDurationData),
      requestedSessionDurationLearnerSig
    );

    // 2. Confirm that hashed_learner_address from the DB matches recovered
    if (hashedLearnerAddress !== ethers.keccak256(recoveredLearnerAddress)) {
      throw new Error('Invalid learner signature or address mismatch');
    }

    // 3. Teacher now signs the *same* sessionDurationData
    try {
      const teacherSig = await pkpWallet.signMessage(ethers.getBytes(sessionDurationData));
      setRequestedSessionDurationTeacherSig(teacherSig);
      return teacherSig;
    } catch (err) {
      console.error('Error signing session_duration_data:', err);
      throw new Error('Teacher signature failed');
    }
  }, [pkpWallet]);

  return {
    signSessionDuration,
    requestedSessionDurationTeacherSig,
    // Optionally, isLoading/isError from a React Query mutation could go here
  };
};
