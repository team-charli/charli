import {SignatureLike, ethers} from 'ethers';
import useLocalStorage from "@rehooks/local-storage";
import { litNodeClient } from '@/utils/litClients';
// import { transferFromLearnerToControllerAction } from '../../LitActions/transferFromLearnerToControllerAction';
import { useSessionSigs } from '@/contexts/AuthContext';

export const useExecuteTransferFromLearnerToController = () => {
  const { data: sessionSigs} = useSessionSigs();
  const executeTransferFromLearnerToController = async (learnerAddress: string, controllerAddress: string, controllerPubKey: string, paymentAmount: bigint, requestedSessionDurationLearnerSig: SignatureLike | null, requestedSessionDurationTeacherSig: SignatureLike | undefined, hashedLearnerAddress: string | undefined, hashedTeacherAddress: string | undefined, sessionDuration: string, secureSessionId: string | null) => {

    const ipfsId = import.meta.env.VITE_TRANSFER_FROM_LEARNER_TO_CONTROLLER_SIGNER_ACTION_IPFS_CID;
    const usdcContractAddress = import.meta.env.VITE_USDC_SEPOLIA_CONTRACT_ADDRESS;
    const chainId = import.meta.env.VITE_CHAIN_ID_SEPOLIA;


    try {
    const results = await litNodeClient.executeJs({
      ipfsId,
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

    console.log('results', results)
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

