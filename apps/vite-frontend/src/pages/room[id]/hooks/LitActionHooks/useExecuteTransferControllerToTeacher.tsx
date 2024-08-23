import { ethers } from 'ethers';
import { AuthSig, SessionSigs } from "@lit-protocol/types";
import { SessionIPFSData } from "@/types/types";
import { litNodeClient } from "@/utils/litClients";


export const useExecuteTransferControllerToTeacher = (
  userIPFSData: SessionIPFSData | null,
  sessionSigs: SessionSigs | null,
  //authSig: AuthSig | null,
  sessionDuration: number | undefined,
  teacherDurationSig: string | undefined,
  learnerDurationSig: string | undefined,
  userAddress: string | undefined,
) => {
  if (!userIPFSData) return null;

  const { signedClientTimestamp, clientTimestamp, teacher, learner, fault } = userIPFSData;

  if (!teacher || !learner || !sessionDuration) {
    console.error("Teacher or Learner data is missing.");
    return null;
  }

  const {
    role: teacherRole,
    peerId: teacherPeerId,
    roomId: teacherRoomId,
    joinedAt: teacherJoinedAt,
    leftAt: teacherLeftAt,
    joinedAtSig: teacherJoinedAtSig,
    leftAtSig: teacherLeftAtSig,
    duration: teacherDuration,
    hashedTeacherAddress,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hashedLearnerAddress: teacherHashedLearnerAddress,
  } = teacher;

  const {
    role: learnerRole,
    peerId: learnerPeerId,
    roomId: learnerRoomId,
    joinedAt: learnerJoinedAt,
    leftAt: learnerLeftAt,
    joinedAtSig: learnerJoinedAtSig,
    leftAtSig: learnerLeftAtSig,
    duration: learnerDuration,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hashedTeacherAddress: learnerHashedTeacherAddress,
    hashedLearnerAddress,
  } = learner;

  const faultData = fault ? {
    faultType: fault.faultType,
    faultUser: fault.user?.role === 'teacher' ? 'teacher' : 'learner',
    faultTime: fault.faultTime,
    faultTimeSig: fault.faultTimeSig,
  } : undefined;

  const executeTransferControllerToTeacher = async (): Promise<string> => {
    const chainId = import.meta.env.VITE_CHAIN_ID;
    const addressTimestampWorkerWallet = import.meta.env.VITE_PUBLIC_ADDRESS_TIMESTAMP_WORKER_WALLET;

    const results = await litNodeClient.executeJs({
      ipfsId,
      sessionSigs,
      jsParams: {
        teacherRole,
        teacherPeerId,
        teacherRoomId,
        teacherJoinedAt,
        teacherLeftAt,
        teacherJoinedAtSig,
        teacherLeftAtSig,
        teacherDuration,
        hashedTeacherAddress,

        learnerRole,
        learnerPeerId,
        learnerRoomId,
        learnerJoinedAt,
        learnerLeftAt,
        learnerJoinedAtSig,
        learnerLeftAtSig,
        learnerDuration,
        hashedLearnerAddress,

        chainId,
        addressTimestampWorkerWallet,
        // authSig,

        clientTimestamp,
        signedClientTimestamp,

        sessionDuration,
        teacherDurationSig,
        learnerDurationSig,

        faultData,
        userAddress
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
  };

  return { executeTransferControllerToTeacher };
};
