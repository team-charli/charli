import useLocalStorage from "@rehooks/local-storage";
import { transferControllerToTeacherAction  } from "../../Lit/Actions/transferControllerToTeacherAction";
import {ethers} from 'ethers'
import { litNodeClient } from "../../utils/lit";

export const useExecuteTransferControllerToTeacher = () => {
  const [sessionSigs] = useLocalStorage('sessionSigs');
  const executeTransferControllerToTeacher = async () => {
    //TODO: get values
    const teacherAddress = "0x";
    const controllerAddress = "0x";
    const controllerPubKey = "0x";
    const paymentAmount = "AMOUNT";
    const usdcContractAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS;
    const chainId = import.meta.env.VITE_CHAIN_ID;

    const results = await litNodeClient.executeJs({
      code: transferControllerToTeacherAction,
      sessionSigs,
      jsParams: {
        teacherAddress,
        controllerAddress,
        controllerPubKey,
        paymentAmount,
        usdcContractAddress
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

