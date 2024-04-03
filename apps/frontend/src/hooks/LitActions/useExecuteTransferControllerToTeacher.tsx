import useLocalStorage from "@rehooks/local-storage";
import { transferControllerToTeacherAction  } from "../../Lit/Actions/transferControllerToTeacherAction";
import {ethers} from 'ethers'
import { litNodeClient } from "../../utils/lit";

export const useExecuteTransferControllerToTeacher = (

) => {
  const [ sessionSigs ] = useLocalStorage("sessionSigs");
  const [ authSig ] = useLocalStorage("authSig");
  const executeTransferControllerToTeacher = async (
        teacherAddressEncrypted: string,
        hashLearnerAddress: string,
        hashTeacherAddress: string,
        controllerAddress: string,
        controllerPubKey: string,
        paymentAmount: number,


        learner_joined_timestamp: string,
        learner_joined_signature: string,

        teacher_joined_timestamp: string,
        teacher_joined_signature: string,

        learner_left_timestamp: string,
        learner_left_signature: string,

        teacher_left_timestamp: string,
        teacher_left_signature: string,

  ) => {
    const usdcContractAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS;
    const chainId = import.meta.env.VITE_CHAIN_ID;
    const chain = import.meta.env.VITE_LIT_CHAIN_NAME;
    //use teacher authSig for now

    const results = await litNodeClient.executeJs({
      code: transferControllerToTeacherAction,
      sessionSigs,
      jsParams: {
        teacherAddressEncrypted,
        hashLearnerAddress,
        hashTeacherAddress,
        controllerAddress,
        controllerPubKey,
        paymentAmount,
        authSig,
        chain,
        usdcContractAddress,
        learner_joined_timestamp,
        learner_joined_signature,
        teacher_joined_timestamp,
        teacher_joined_signature,
        learner_left_timestamp,
        learner_left_signature,
        teacher_left_timestamp,
        teacher_left_signature,
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
  }
  return {executeTransferControllerToTeacher};
}

