import {SignatureLike, ethers} from 'ethers';
import useLocalStorage from "@rehooks/local-storage";
import { transferFromLearnerToControllerAction  } from "../../Lit/Actions/transferFromLearnerToControllerAction";
import { litNodeClient } from '@/utils/litClients';

export const useExecuteTransferFromLearnerToController = () => {
  const [sessionSigs] = useLocalStorage('sessionSigs');
  const executeTransferFromLearnerToController = async (learnerAddress: string, controllerAddress: string, controllerPubKey: string, paymentAmount: bigint, requestedSessionDurationLearnerSig: SignatureLike | undefined, requestedSessionDurationTeacherSig: SignatureLike | undefined, hashedLearnerAddress: string | undefined, hashedTeacherAddress: string | undefined) => {
    const usdcContractAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS;
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;

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
        requestedSessionDurationLearnerSig,
        requestedSessionDurationTeacherSig,
        hashedLearnerAddress,
        hashedTeacherAddress
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

