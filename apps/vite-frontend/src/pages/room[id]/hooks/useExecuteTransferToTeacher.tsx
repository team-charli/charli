// useExecuteTransfer.ts
import { useMutation } from '@tanstack/react-query';
import { useLitAccount, useSessionSigs } from '@/contexts/AuthContext';
import { litNodeClient } from '@/utils/litClients';
import { ethers } from 'ethers';
import { SessionIPFSData } from '@/types/types';

export const useExecuteTransferToTeacher = (
  userIPFSData: SessionIPFSData | null,
  sessionDuration: number | undefined,
  teacherDurationSig: string | undefined,
  learnerDurationSig: string | undefined
) => {
  const { data: currentAccount } = useLitAccount();
  const { data: sessionSigs } = useSessionSigs();

  const executeTransferMutation = useMutation({
    mutationFn: async () => {
      if (!userIPFSData || !sessionDuration || !teacherDurationSig || !learnerDurationSig) {
        throw new Error('Required data is missing');
      }

      const { signedClientTimestamp, clientTimestamp, teacher, learner, fault } = userIPFSData;
      if (!teacher || !learner) {
        throw new Error('Teacher or Learner data is missing');
      }

      const chainId = import.meta.env.VITE_CHAIN_ID;
      const addressTimestampWorkerWallet = import.meta.env.VITE_PUBLIC_ADDRESS_TIMESTAMP_WORKER_WALLET;
      if (!chainId || !addressTimestampWorkerWallet) {
        throw new Error('Missing environment variables');
      }

      const results = await litNodeClient.executeJs({
        ipfsId: 'your_ipfs_id_here', // You need to provide this
        sessionSigs: sessionSigs || {},
        jsParams: {
          teacherRole: teacher.role,
          teacherPeerId: teacher.peerId,
          teacherRoomId: teacher.roomId,
          teacherJoinedAt: teacher.joinedAt,
          teacherLeftAt: teacher.leftAt,
          teacherJoinedAtSig: teacher.joinedAtSig,
          teacherLeftAtSig: teacher.leftAtSig,
          teacherDuration: teacher.duration,
          hashedTeacherAddress: teacher.hashedTeacherAddress,
          learnerRole: learner.role,
          learnerPeerId: learner.peerId,
          learnerRoomId: learner.roomId,
          learnerJoinedAt: learner.joinedAt,
          learnerLeftAt: learner.leftAt,
          learnerJoinedAtSig: learner.joinedAtSig,
          learnerLeftAtSig: learner.leftAtSig,
          learnerDuration: learner.duration,
          hashedLearnerAddress: learner.hashedLearnerAddress,
          chainId,
          addressTimestampWorkerWallet,
          clientTimestamp,
          signedClientTimestamp,
          sessionDuration,
          teacherDurationSig,
          learnerDurationSig,
          faultData: fault ? {
            faultType: fault.faultType,
            faultUser: fault.user?.role === 'teacher' ? 'teacher' : 'learner',
            faultTime: fault.faultTime,
            faultTimeSig: fault.faultTimeSig,
          } : undefined,
          userAddress: currentAccount?.ethAddress
        },
      });

      const { signatures, response } = results;
      const sig = signatures.sig1;
      const encodedSig = ethers.Signature.from({
        r: "0x" + sig.r,
        s: "0x" + sig.s,
        v: sig.recid,
      }).serialized;
      // @ts-expect-error:next-line
      const { txParams } = response; // eslint-disable-line
      const txn = ethers.Transaction.from({ ...txParams, signature: encodedSig }).serialized;
      return txn;
    },
    onSuccess: () => {
      console.log('Transfer executed successfully');
    },
    onError: (error) => {
      console.error('Failed to execute transfer:', error);
    },
  });

  return executeTransferMutation;
};
