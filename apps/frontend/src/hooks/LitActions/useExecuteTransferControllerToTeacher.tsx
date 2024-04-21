import { transferControllerToTeacherAction } from "../../Lit/Actions/transferControllerToTeacherAction";
import { ethers } from 'ethers';
import { litNodeClient } from "../../utils/lit";
import { AuthSig, SessionSigs } from "@lit-protocol/types";

interface User {
  role: "teacher" | "learner" | null;
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  joinedAtSig: string | null;
  leftAtSig: string | null;
  faultTime?: number;
  faultTimeSig?: string;
  duration: number | null;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
}

interface SessionData {
  teacher: User | null;
  learner: User | null;
}

interface SessionIPFSData extends SessionData {
  signedClientTimestamp: string;
  clientTimestamp: number;
  confirmedDuration: number;
  confirmedDuration_teacherSignature: string;
  confirmedDuration_learnerSignature: string;
}

export const useExecuteTransferControllerToTeacher = (
  userIPFSData: SessionIPFSData | undefined,
  sessionSigs: SessionSigs,
  authSig: AuthSig,
  sessionDuration: string,
  teacherDurationSig: string,
  learnerDurationSig: string
) => {
  if (!userIPFSData) return null;

  const { signedClientTimestamp, clientTimestamp, teacher, learner } = userIPFSData;

  if (!teacher || !learner) {
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
    faultTime: teacherFaultTime,
    faultTimeSig: teacherFaultTimeSig,
    duration: teacherDuration,
    hashedTeacherAddress,
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
    faultTime: learnerFaultTime,
    faultTimeSig: learnerFaultTimeSig,
    duration: learnerDuration,
    hashedTeacherAddress: learnerHashedTeacherAddress,
    hashedLearnerAddress,
  } = learner;

  const executeTransferControllerToTeacher = async (): Promise<string> => {
    const usdcContractAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS;
    const chainId = import.meta.env.VITE_CHAIN_ID;
    const chain = import.meta.env.VITE_LIT_CHAIN_NAME;
    const addressTimestampWorkerWallet = import.meta.env.VITE_PUBLIC_ADDRESS_TIMESTAMP_WORKER_WALLET;

    const results = await litNodeClient.executeJs({
      code: transferControllerToTeacherAction,
      sessionSigs,
      jsParams: {
        teacherRole,
        teacherPeerId,
        teacherRoomId,
        teacherJoinedAt,
        teacherLeftAt,
        teacherJoinedAtSig,
        teacherLeftAtSig,
        teacherFaultTime,
        teacherFaultTimeSig,
        teacherDuration,
        hashedTeacherAddress,
        teacherHashedLearnerAddress,

        learnerRole,
        learnerPeerId,
        learnerRoomId,
        learnerJoinedAt,
        learnerLeftAt,
        learnerJoinedAtSig,
        learnerLeftAtSig,
        learnerFaultTime,
        learnerFaultTimeSig,
        learnerDuration,
        learnerHashedTeacherAddress,
        hashedLearnerAddress,

        usdcContractAddress,
        chainId,
        chain,
        addressTimestampWorkerWallet,
        authSig,

        clientTimestamp,
        signedClientTimestamp,

        sessionDuration,
        teacherDurationSig,
        learnerDurationSig
      },
    });

    const { signatures, response } = results;
    const sig = signatures.sig1;
    const encodedSig = ethers.Signature.from({
      r: "0x" + sig.r,
      s: "0x" + sig.s,
      v: sig.recid,
    }).serialized;

    const { txParams } = response;
    const txn = ethers.Transaction.from({ ...txParams, signature: encodedSig }).serialized;
    return txn;
  };

  return { executeTransferControllerToTeacher };
};
