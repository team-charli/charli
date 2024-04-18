import { transferControllerToTeacherAction  } from "../../Lit/Actions/transferControllerToTeacherAction";
import {ethers} from 'ethers'
import { litNodeClient } from "../../utils/lit";
import { AuthSig, SessionSigs } from "@lit-protocol/types";

export const useExecuteTransferControllerToTeacher = (userIPFSData: UserIPFSData| undefined, sessionSigs: SessionSigs, authSig: AuthSig ) => {

  const executeTransferControllerToTeacher = async (
    {
      clientTimestamp,
      signedClientTimestamp,
      role,
      peerId,
      roomId,
      joinedAt,
      leftAt,
      joinedAtSig,
      leftAtSig,
      faultTime,
      faultTimeSig,
      duration,
      hashedTeacherAddress,
      hashedLearnerAddress,
    }: UserIPFSData
  ): Promise<string> => {
    const usdcContractAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS;
    const chainId = import.meta.env.VITE_CHAIN_ID;
    const chain = import.meta.env.VITE_LIT_CHAIN_NAME;
    const addressTimestampWorkerWallet = import.meta.env.VITE_PUBLIC_ADDRESS_TIMESTAMP_WORKER_WALLET;
    //use teacher authSig for now

    const results = await litNodeClient.executeJs({
      code: transferControllerToTeacherAction,
      sessionSigs,
      jsParams: {
        clientTimestamp,
        signedClientTimestamp,
        role,
        peerId,
        roomId,
        joinedAt,
        leftAt,
        joinedAtSig,
        leftAtSig,
        faultTime,
        faultTimeSig,
        duration,
        hashedTeacherAddress,
        hashedLearnerAddress,

        usdcContractAddress,
        chainId,
        chain,
        addressTimestampWorkerWallet,
        authSig,
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
    return txn
  }
  return {executeTransferControllerToTeacher};
}
interface UserIPFSData {
  clientTimestamp: number;
  signedClientTimestamp: string;
  role: "teacher" | "learner" | null;
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  joinedAtSig?: string | null;
  leftAtSig?: string | null;
  faultTime?: number;
  faultTimeSig?: string;
  duration?: number | null;
  hashedTeacherAddress?: string;
  hashedLearnerAddress: string;
}

