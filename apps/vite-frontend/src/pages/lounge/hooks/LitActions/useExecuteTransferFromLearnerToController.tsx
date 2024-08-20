import {SignatureLike, ethers} from 'ethers';
import useLocalStorage from "@rehooks/local-storage";
import { litNodeClient } from '@/utils/litClients';
import { transferFromLearnerToControllerAction } from '../../LitActions/transferFromLearnerToControllerAction';

export const useExecuteTransferFromLearnerToController = () => {
  const [sessionSigs] = useLocalStorage('sessionSigs');
  const executeTransferFromLearnerToController = async (learnerAddress: string, controllerAddress: string, controllerPubKey: string, paymentAmount: bigint, requestedSessionDurationLearnerSig: SignatureLike | null, requestedSessionDurationTeacherSig: SignatureLike | undefined, hashedLearnerAddress: string | undefined, hashedTeacherAddress: string | undefined, sessionDuration: string, secureSessionId: string | null) => {

    const usdcContractAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS;
    const chainId = import.meta.env.VITE_CHAIN_ID;

    try {
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
        sessionDuration,
        requestedSessionDurationLearnerSig,
        requestedSessionDurationTeacherSig,
        hashedLearnerAddress,
        hashedTeacherAddress,
        secureSessionId
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
    console.log('txn', txn)
    return txn;
    } catch (e) {
      console.error(e);
    }
  }
  return executeTransferFromLearnerToController;
}

