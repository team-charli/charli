import {SignatureLike} from 'ethers';
import { litNodeClient } from '@/utils/litClients';
import { useAddResourceAndRefectchSessionSigsQuery } from '@/contexts/hooks/Auth/LitAuth/useAddResourceAndRefectchSessionSigs';
export const useExecuteTransferFromLearnerToController = () => {
  const addResourceAndRefetchSessionSigs = useAddResourceAndRefectchSessionSigsQuery();

  const executeTransferFromLearnerToController = async (controllerAddress: string,  paymentAmount: bigint, requestedSessionDurationLearnerSig: SignatureLike | null, requestedSessionDurationTeacherSig: SignatureLike | undefined, hashedLearnerAddress: string | undefined, hashedTeacherAddress: string | undefined, sessionDuration: number | null, sessionId: number | null, secureSessionId: string | null, learnerAddressEncryptHash: string | null, learnerAddressCipherText: string | null,
  ) => {

    const transferFromActionIpfsId = import.meta.env.VITE_TRANSFER_FROM_ACTION_IPFSID;
    const daiContractAddress= import.meta.env.VITE_DAI_CONTRACT_ADDRESS_BASE_SEPOLIA;
    const rpcChainId = import.meta.env.VITE_CHAIN_ID_FOR_ACTION_PARAMS_BASE_SEPOLIA;
    const ethereumRelayerPublicKey = import.meta.env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY;
    const relayerIpfsId = import.meta.env.VITE_CHARLI_ETHEREUM_RELAYER_ACTION_IPFS_ID;
    const env = import.meta.env.VITE_ENVIRONMENT;
    const accessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: "ethereum",
        method: '',
        parameters: [
          '0x',
        ],
        returnValueTest: {
          comparator: '=',
          value: '0x'
        }
      }
    ]
    const sessionSigs = await addResourceAndRefetchSessionSigs(accessControlConditions, learnerAddressEncryptHash);
    if (!sessionSigs) throw new Error('sessionSigs undefined')

    try {
      const jsParams = {
        ipfsId: transferFromActionIpfsId,
        learnerAddressCiphertext: learnerAddressCipherText,
        learnerAddressEncryptHash,
        controllerAddress,
        daiContractAddress,
        sessionDataLearnerSig: requestedSessionDurationLearnerSig,
        sessionDataTeacherSig: requestedSessionDurationTeacherSig,
        sessionDuration,
        sessionId,
        secureSessionId,
        hashedLearnerAddress,
        hashedTeacherAddress,
        amount: paymentAmount.toString(),
        accessControlConditions,
        rpcChain: 'baseSepolia',
        rpcChainId,
        ethereumRelayerPublicKey,
        relayerIpfsId,
        env,
      }
      console.log("transferFrom jsParams", jsParams)
      const transferFromResult = await litNodeClient.executeJs({
        ipfsId: transferFromActionIpfsId ,
        sessionSigs,
        jsParams,
      });

      console.log('results', transferFromResult)
      console.log('results', transferFromResult.logs)

    } catch (e) {
      console.error(e);
    }
  }
  return executeTransferFromLearnerToController;
}

