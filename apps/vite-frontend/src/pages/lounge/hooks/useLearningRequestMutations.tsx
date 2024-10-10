// useUserItem.ts
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ethers, BigNumberish, AddressLike, JsonRpcProvider } from 'ethers';
import { usePkpWallet, useLitAccount, useSupabaseClient, useSessionSigs } from '@/contexts/AuthContext';
import { litNodeClient } from '@/utils/litClients';
import { convertLocalTimetoUtc } from '@/utils/app';
import { ControllerData } from '@/types/types';
import { condenseSignatures } from '../utils/condenseSignatures';
import { restoreSignatures } from '../utils/restoreSignatures';

export const useLearningRequestMutations = (isLearnMode: boolean) => {
  if (!isLearnMode) throw new Error("need isLearnMode input");
  const { data: supabaseClient } = useSupabaseClient();
  const { data: sessionSigs } = useSessionSigs();
  const { data: currentAccount } = useLitAccount();
  const { data: pkpWallet } = usePkpWallet();
  if (!supabaseClient) throw new Error("supabaseClient undefined")

  const generateControllerData = useCallback(async (): Promise<ControllerData> => {
    const uniqueData = `ControllerPKP_${Date.now()}`;
    const bytes = ethers.toUtf8Bytes(uniqueData);
    const userId = ethers.keccak256(bytes);

    const claimKeyIpfsId = import.meta.env.VITE_CLAIM_KEY_IPFS_ID;

    const keyId = litNodeClient.computeHDKeyId(userId, claimKeyIpfsId, true);
    let getControllerKeyClaimDataResponse: any;
    try {
      getControllerKeyClaimDataResponse = await supabaseClient.functions.invoke('get-controller-key-claim-data', {
        body: JSON.stringify({
          keyId
        })
      });
    } catch (error) {
      console.log(error)
    }

    // returned: data.[publicKey, claimAndMintResult];
    if (Object.keys(getControllerKeyClaimDataResponse).length >1 ) {
      console.log('getControllerKeyClaimDataResponse: true')
    }

    const controllerPubKey = getControllerKeyClaimDataResponse.data[0];
    const inputPublicKey = controllerPubKey;
    console.log("controllerPubKey", controllerPubKey)
    const controllerAddress = ethers.computeAddress(controllerPubKey);
    const inputAddress = controllerAddress;
    const derivedKeyId = getControllerKeyClaimDataResponse.data[1][keyId].derivedKeyId;
    const rawControllerClaimKeySigs = getControllerKeyClaimDataResponse.data[1][keyId].signatures;


    const condensedSigs = condenseSignatures(rawControllerClaimKeySigs);
    /*--Store Base64 Sigs in DB--*/
    // -- db put --
    /* Restore Signatures -- */
    const controllerClaimKeySigs = restoreSignatures(condensedSigs);

    //mintClaimBurn
    let mintClaimResponse: any;
    try {
      mintClaimResponse = await supabaseClient.functions.invoke('mint-controller-pkp', {
        body: JSON.stringify({
          keyType: 2,
          derivedKeyId: derivedKeyId,
          signatures: controllerClaimKeySigs,
          env: "dev",
          ipfsIdsToRegister: [import.meta.env.VITE_TRANSFERFROM_ACTION_IPFSID]

        })
      });
    } catch (error) {
      console.log(error);
    }

    if (Object.keys(mintClaimResponse).length > 1) {
      console.log("success mintClaimResponse")
    }
    const outputPublicKey = mintClaimResponse.data.pkpInfo.publicKey;
    const outputAddress = ethers.computeAddress(outputPublicKey);

    return {
      controller_address: controllerAddress,
      controller_public_key: controllerPubKey,
    };
  }, []);

  const signSessionDurationAndSecureSessionId = useMutation({
    mutationFn: async ({ sessionDuration, secureSessionId }: { sessionDuration: number, secureSessionId: string }) => {
      if (!pkpWallet) throw new Error('Wallet not initialized');

      const encodedData = ethers.concat([
        ethers.toUtf8Bytes(secureSessionId),
        ethers.toBeHex(sessionDuration)
      ]);

      const message = ethers.keccak256(encodedData);
      return await pkpWallet.signMessage(ethers.getBytes(message));
    },
  });



  type SignPermitAndCollectActionParams = {controllerAddress: AddressLike, provider: JsonRpcProvider, amountScaled: BigNumberish, secureSessionId: string, sessionIdAndDurationSig: string, sessionDuration: number};

  const signPermitAndCollectActionParams = useMutation({
    mutationFn: async (params: SignPermitAndCollectActionParams) => {
      try {
        const { controllerAddress, provider, amountScaled, secureSessionId, sessionIdAndDurationSig, sessionDuration } = params;

        if (!pkpWallet) throw new Error('Wallet not initialized');
        const daiContractAddress = import.meta.env.VITE_DAI_CONTRACT_ADDRESS_BASE_SEPOLIA;
        const daiContractAbi = [
          'function name() view returns (string)',
          // 'function version() view returns (string)',
          'function nonces(address owner) view returns (uint256)',
          'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ];
        console.log("daiContractAddress", typeof daiContractAddress)
        console.log("daiContractAddress", daiContractAddress)

        const daiContract = new ethers.Contract(daiContractAddress, daiContractAbi, provider);

        const currentAllowance = await daiContract.allowance(pkpWallet.address, controllerAddress);
        if (currentAllowance >= amountScaled) {
          console.log("Approval already set, skipping permit transaction");
          return;
        }

        // permit setup
        // Set Permit Parameters
        const owner = pkpWallet.address;
        const spender = controllerAddress; // Your application's address or PKP address
        const value = amountScaled.toString();
        const deadline = (Math.floor(Date.now() / 1000) + 3600).toString(); // Convert to string
        const nonceBN = await daiContract.nonces(owner);
        const nonce = nonceBN.toString();

        // Types as per EIP-712
        const types = {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
          ],
        };

        const message = {
          owner,
          spender,
          value,
          nonce,
          deadline
        };

        // **Domain Data for EIP-712**

        const domain = {
          name: await daiContract.name(),
          version: '1',
          chainId: import.meta.env.VITE_CHAIN_ID_FOR_ACTION_PARAMS_BASE_SEPOLIA,
          verifyingContract: daiContractAddress,
        };

        // **Request Signature from the User**
        const signature = await pkpWallet._signTypedData(domain, types, message);

        // **Extract v, r, s from the Signature**
        const splitSig = ethers.Signature.from(signature);
        const v = splitSig.v;
        const r = splitSig.r;
        const s = splitSig.s;


        return {v, s, r, owner, spender, nonce, deadline, value, daiContractAddress, relayerIpfsId: import.meta.env.VITE_RELAYER_ACTION_IPFSID, rpcChain: import.meta.env.VITE_RPC_CHAIN_NAME, rpcChainId: import.meta.env.VITE_CHAIN_ID_FOR_ACTION_PARAMS_BASE_SEPOLIA, secureSessionId, sessionIdAndDurationSig, learnerAddress: pkpWallet.address, duration: sessionDuration, env: import.meta.env.VITE_ENVIRONMENT}
      } catch (error) {
        console.log(error);
      }
    },
  });

  type PermitActionParams = {
    owner: AddressLike,
    spender: AddressLike,
    nonce: string,
    deadline: string ,
    value: string,
    v: number,
    r: string,
    s: string,
    daiContractAddress: AddressLike,
    relayerIpfsId: string,
    rpcChain: string,
    rpcChainId: string,
    secureSessionId: string,
    sessionIdAndDurationSig: string,
    learnerAddress: AddressLike,
    duration: number,
    env: 'dev',
  }

const executePermitAction = useMutation({
  mutationFn: async (actionParams: PermitActionParams | undefined) => {
    if (!actionParams) throw new Error('actionParams undefined');
    const {
      owner, spender, nonce, deadline, value, v, r, s,
      daiContractAddress, relayerIpfsId, rpcChain, rpcChainId,
      secureSessionId, sessionIdAndDurationSig, learnerAddress, duration, env
    } = actionParams;

    const result = await litNodeClient.executeJs({
      ipfsId: import.meta.env.VITE_PERMIT_ACTION_IPFSID,
      sessionSigs,
      jsParams: {
        owner, spender, nonce, deadline, value, v, r, s,
        daiContractAddress, relayerIpfsId, rpcChain, rpcChainId,
        secureSessionId, sessionIdAndDurationSig, learnerAddress, duration, env
      }
    });

    if (!result.success) {
      throw new Error('Permit action failed');
    }

    if (typeof result.response !== 'string') {
      throw new Error('Unexpected response type');
    }

    try {
      const txHash = JSON.parse(JSON.parse(result.response));
      return { txHash };
    } catch (error) {
      throw new Error('Failed to parse transaction hash');
    }
  },
});

  const submitLearningRequestToDb = useMutation({
    mutationFn: async ({
      dateTime,
      teacherID,
      userID,
      teachingLang,
      sessionDuration,
      learnerSessionDurationSig,
      secureSessionId,
      controllerData,
    }: any) => {
      if (!supabaseClient || !currentAccount) throw new Error('Supabase client or current account not available');
      const utcDateTime = convertLocalTimetoUtc(dateTime);
      let hashed_learner_address = ethers.keccak256(currentAccount.ethAddress);
      const { error } = await supabaseClient
        .from('sessions')
        .insert([{
          teacher_id: teacherID,
          learner_id: userID,
          request_time_date: utcDateTime,
          request_origin_type: "learner",
          request_origin: userID,
          teaching_lang: teachingLang,
          requested_session_duration: sessionDuration,
          hashed_learner_address,
          requested_session_duration_learner_sig: learnerSessionDurationSig,
          secure_session_id: secureSessionId,
          controller_claim_user_id: controllerData.controller_claim_user_id,
          controller_public_key: controllerData.controller_public_key,
          controller_claim_keyid: controllerData.claim_key_id,
          controller_address: controllerData.controller_address
        }])
        .select();
      if (error) throw error;
      return true;
    },
  });

  return {
    generateControllerData,
    signPermitAndCollectActionParams,
    executePermitAction,
    submitLearningRequestToDb,
    signSessionDurationAndSecureSessionId
  };
};
