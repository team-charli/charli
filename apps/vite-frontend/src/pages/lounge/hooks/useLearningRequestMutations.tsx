// useLearningRequestMutations.tsx
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ethers, BigNumberish, AddressLike, JsonRpcProvider } from 'ethers';
import { usePkpWallet, useLitAccount, useSupabaseClient, useSessionSigs } from '@/contexts/AuthContext';
import { litNodeClient } from '@/utils/litClients';
import { convertLocalTimetoUtc } from '@/utils/app';
import { SessionControllerData } from '@/types/types';

export const useLearningRequestMutations = () => {

  const { data: supabaseClient } = useSupabaseClient();
  const { data: sessionSigs } = useSessionSigs();
  const { data: currentAccount } = useLitAccount();
  const { data: pkpWallet } = usePkpWallet();

  if (!supabaseClient) throw new Error("supabaseClient undefined")

  const generateControllerData = useCallback(async (learnerId: number): Promise<SessionControllerData> => {
    const uniqueData = `ControllerPKP_${Date.now()}`;
    const bytes = ethers.toUtf8Bytes(uniqueData);
    const userId = ethers.keccak256(bytes);

    const claimKeyIpfsId = import.meta.env.VITE_CLAIM_KEY_IPFS_ID;

    const keyId = litNodeClient.computeHDKeyId(userId, claimKeyIpfsId, true);
    let getControllerKeyClaimDataResponse: any;
    try {
      getControllerKeyClaimDataResponse = await supabaseClient.functions.invoke('get-controller-key-claim-data', {
        body: JSON.stringify({
          keyId,
          learnerId
        })
      });
    } catch (error) {
      console.log(error)
    }

    const controllerPubKey = getControllerKeyClaimDataResponse.data.publicKey;
    const controllerAddress = ethers.computeAddress(controllerPubKey);
    const sessionId = getControllerKeyClaimDataResponse.data.sessionId;

    return {
      controller_address: controllerAddress,
      controller_public_key: controllerPubKey,
      sessionId
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
  type PermitActionParamsWithSkip =
  | { skipPermit: true }
  | ({ skipPermit: false } & PermitActionParams);

  const signPermitAndCollectActionParams = useMutation<
  PermitActionParamsWithSkip,
  unknown,
  SignPermitAndCollectActionParams
>({
    mutationFn: async (params) => {
      try {
        const { provider, amountScaled, secureSessionId, sessionIdAndDurationSig, sessionDuration } = params;
        const relayerAddress = import.meta.env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_ADDRESS;

        if (!pkpWallet) throw new Error('Wallet not initialized');

        const daiContractAddress = import.meta.env.VITE_DAI_CONTRACT_ADDRESS_BASE_SEPOLIA;
        const daiContractAbi = [
          'function name() view returns (string)',
          'function nonces(address owner) view returns (uint256)',
          'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ];
        const daiContract = new ethers.Contract(daiContractAddress, daiContractAbi, provider);

        const currentAllowance = await daiContract.allowance(pkpWallet.address, relayerAddress);
        if (currentAllowance >= amountScaled) {
          // Already approved
          console.log("Approval already set, skipping permit transaction");
          return { skipPermit: true };
        }

        // EIP-712 permit setup
        const owner = pkpWallet.address;
        const spender = relayerAddress;
        const value = amountScaled.toString();
        const deadline = (Math.floor(Date.now() / 1000) + 3600).toString();
        const nonceBN = await daiContract.nonces(owner);
        const nonce = nonceBN.toString();

        // Full typed-data domain
        const domain = {
          name: await daiContract.name(),
          version: '1',
          chainId: import.meta.env.VITE_CHAIN_ID_FOR_ACTION_PARAMS_BASE_SEPOLIA,
          verifyingContract: daiContractAddress,
        };

        const types = {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
          ],
        };

        const message = { owner, spender, value, nonce, deadline };

        const signature = await pkpWallet._signTypedData(domain, types, message);
        const splitSig = ethers.Signature.from(signature);
        const v = splitSig.v, r = splitSig.r, s = splitSig.s;

        // Return the "full" object, plus skipPermit: false
        return {
          skipPermit: false,
          v, s, r, owner, spender, nonce, deadline, value,
          daiContractAddress,
          relayerIpfsId: import.meta.env.VITE_RELAYER_ACTION_IPFSID,
          rpcChain: import.meta.env.VITE_RPC_CHAIN_NAME,
          rpcChainId: import.meta.env.VITE_CHAIN_ID_FOR_ACTION_PARAMS_BASE_SEPOLIA,
          secureSessionId,
          sessionIdAndDurationSig,
          learnerAddress: pkpWallet.address,
          duration: sessionDuration,
          env: import.meta.env.VITE_ENVIRONMENT as 'dev',
        };
      } catch (error) {
        console.error(error);
        // Rethrow so the mutation rejects, not returns undefined
        throw error;
      }
    },
  });

  type PermitActionParams = {
    owner: AddressLike,
    spender: AddressLike,
    nonce: string,
    deadline: string,
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
  };



  const executePermitAction = useMutation({
    mutationFn: async (actionParams: PermitActionParams | undefined) => {
      if (!actionParams) throw new Error('actionParams undefined');
      const {
        owner, spender, nonce, deadline, value, v, r, s,
        daiContractAddress, relayerIpfsId, rpcChain, rpcChainId,
        secureSessionId, sessionIdAndDurationSig, learnerAddress, duration, env
      } = actionParams;

      const permitActionIpfsId = import.meta.env.VITE_PERMIT_ACTION_IPFSID;
      const result = await litNodeClient.executeJs({
        ipfsId: permitActionIpfsId,
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
      sessionId,
      secureSessionId,
      ciphertext,
      dataToEncryptHash
    }: any) => {

      if (!supabaseClient || !currentAccount) throw new Error('Supabase client or current account not available');
      const utcDateTime = convertLocalTimetoUtc(dateTime);
      let hashed_learner_address = ethers.keccak256(currentAccount.ethAddress);

      const { data, error } = await supabaseClient
        .from('sessions')
        .update([{
          teacher_id: teacherID,
          request_time_date: utcDateTime,
          request_origin: userID,
          teaching_lang: teachingLang,
          requested_session_duration: sessionDuration,
          hashed_learner_address,
          requested_session_duration_learner_sig: learnerSessionDurationSig,
          secure_session_id: secureSessionId,
          learner_address_encrypt_hash: dataToEncryptHash,
          learner_address_cipher_text: ciphertext
        }])
        .eq('session_id', sessionId)
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
