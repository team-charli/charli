import {ethers} from 'ethers';
import useLocalStorage from "@rehooks/local-storage";
import { litNodeClient } from "../../utils/lit";
import { transferFromLearnerToControllerAction  } from "../../Lit/Actions/transferFromLearnerToControllerAction";

export const useExecuteTransferFromLearnerToController = () => {
  const [sessionSigs] = useLocalStorage('sessionSigs');
  const executeTransferFromLearnerToController = async (learnerAddress: string, controllerAddress: string, controllerPubKey: string, paymentAmount: BigInt) => {
    const usdcContractAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS;
    const chainId = import.meta.env.VITE_CHAIN_ID;

    const results = await litNodeClient.executeJs({
      code: transferFromLearnerToControllerAction ,
      sessionSigs,
      jsParams: {
        learnerAddress,
        controllerAddress,
        controllerPubKey,
        paymentAmount,
        usdcContractAddress,
        chainId,
      },
    });

    const { signatures, response } = results;
    const sig = signatures.sig1;
    const encodedSig = ethers.Signature.from({
      r: "0x" + sig.r,
      s: "0x" + sig.s,
      v: sig.recid,
    }).serialized;

    const { txParams } = response as any;

    const txn = ethers.Transaction.from({ ...txParams, signature: encodedSig }).serialized;

    return txn;
  }
  return { executeTransferFromLearnerToController };
}

