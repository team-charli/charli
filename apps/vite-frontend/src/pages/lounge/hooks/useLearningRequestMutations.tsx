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
    mutationFn: async ({ sessionDuration, secureSessionId }: {
      sessionDuration: number;
      secureSessionId: string;
    }) => {
      if (!pkpWallet) throw new Error('Wallet not initialized');
      // 1. Construct the raw “session duration data” that you want both parties to sign
      const encodedData = ethers.concat([
        ethers.toUtf8Bytes(secureSessionId),
        ethers.toBeHex(sessionDuration),
      ]);

      // 2. Hash it – that hash is the canonical message
      const sessionDurationData = ethers.keccak256(encodedData);

      // 3. Sign that hashed message
      const signature = await pkpWallet.signMessage(ethers.getBytes(sessionDurationData));

      // Return both the signature and the raw data
      return { signature, sessionDurationData };
    },
  });


  type SignPermitAndCollectActionParams = {controllerAddress: AddressLike, provider: JsonRpcProvider, amountScaled: BigNumberish, secureSessionId: string, requestedSessionDurationLearnerSig: string, sessionDuration: number};
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
        const relayerAddress = import.meta.env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_ADDRESS;
        const usdcContractAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS_BASE_SEPOLIA;

        console.log({relayerAddress, usdcContractAddress});
        if (!relayerAddress || !usdcContractAddress) throw new Error(`don't have vite imports`)

        const { provider, amountScaled, secureSessionId, requestedSessionDurationLearnerSig, sessionDuration } = params;

        if (!pkpWallet) throw new Error('Wallet not initialized');

        console.log('usdcContractAddress', usdcContractAddress)
        const usdcABI = [
          'function name() view returns (string)',
          'function nonces(address owner) view returns (uint256)',
          'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ];
        const usdcContract = new ethers.Contract(usdcContractAddress, usdcABI, provider);
        console.log('usdcABI', usdcABI)

        const currentAllowance = await usdcContract.allowance(pkpWallet.address, relayerAddress);
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
        const nonceBN = await  usdcContract.nonces(owner);
        const nonce = nonceBN.toString();

        // Get the actual contract name for the domain
        const contractName = await usdcContract.name();
        console.log("USDC Contract name:", contractName);

        // Full typed-data domain - use actual contract values
        const domain = {
          name: contractName,
          version: '1',
          chainId: import.meta.env.VITE_CHAIN_ID_FOR_ACTION_PARAMS_BASE_SEPOLIA,
          verifyingContract: usdcContractAddress,
        };
        console.log("Domain used for signing:", domain);

        // USDC Permit type structure
        const types = {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
          ],
        };
        console.log("Types used for signing:", types);

        const message = { owner, spender, value, nonce, deadline };

        const signature = await pkpWallet._signTypedData(domain, types, message);
        const splitSig = ethers.Signature.from(signature);
        const v = splitSig.v, r = splitSig.r, s = splitSig.s;

        // Return the "full" object, plus skipPermit: false
        return {
          skipPermit: false,
          v, s, r, owner, spender, nonce, deadline, value,
          usdcContractAddress,
          relayerIpfsId: import.meta.env.VITE_RELAYER_ACTION_IPFSID,
          rpcChain: import.meta.env.VITE_RPC_CHAIN_NAME,
          rpcChainId: import.meta.env.VITE_CHAIN_ID_FOR_ACTION_PARAMS_BASE_SEPOLIA,
          secureSessionId,
          requestedSessionDurationLearnerSig,
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
    usdcContractAddress: AddressLike,
    relayerIpfsId: string,
    rpcChain: string,
    rpcChainId: string,
    secureSessionId: string,
    requestedSessionDurationLearnerSig: string,
    learnerAddress: AddressLike,
    duration: number,
    env: 'dev',
  };



  const executePermitAction = useMutation({
    mutationFn: async (actionParams: PermitActionParams | undefined) => {
      if (!actionParams) throw new Error('actionParams undefined');

      const {
        owner, spender, nonce, deadline, value, v, r, s,
        usdcContractAddress, relayerIpfsId, rpcChain, rpcChainId,
        secureSessionId, requestedSessionDurationLearnerSig, learnerAddress, duration, env
      } = actionParams;

      const permitActionIpfsId = import.meta.env.VITE_PERMIT_ACTION_IPFSID;

      if (!permitActionIpfsId) {
        console.log({permitActionIpfsId})
        throw new Error (`no permitActionIpfsId injected from deploy-all.ts`)
      }

      try {
        console.log("Executing permit action with details:", {
          permitActionIpfsId,
          relayerPkpAddress: import.meta.env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_ADDRESS,
          usdcContractAddress,
          relayerIpfsId
        });

        // Execute the Lit Action
        // Get PKP information from environment variables
        const relayerPkpTokenId = import.meta.env.VITE_RELAYER_PKP_TOKEN_ID;
        const relayerPublicKey = import.meta.env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY;
        
        // Debug: Log all relevant environment variables
        console.log("Environment variables:", {
          VITE_RELAYER_PKP_TOKEN_ID: import.meta.env.VITE_RELAYER_PKP_TOKEN_ID,
          VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY: import.meta.env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_PUBLIC_KEY,
          VITE_CHARLI_ETHEREUM_RELAYER_PKP_ADDRESS: import.meta.env.VITE_CHARLI_ETHEREUM_RELAYER_PKP_ADDRESS,
          VITE_PERMIT_ACTION_IPFSID: import.meta.env.VITE_PERMIT_ACTION_IPFSID,
          VITE_RELAYER_ACTION_IPFSID: import.meta.env.VITE_RELAYER_ACTION_IPFSID
        });
        
        console.log("Using PKP information:", {
          relayerPkpTokenId,
          relayerAddress: spender, // This is already the relayer address
          relayerPublicKey
        });
        
        const result = await litNodeClient.executeJs({
          ipfsId: permitActionIpfsId,
          sessionSigs,
          jsParams: {
            owner, spender, nonce, deadline, value, v, r, s,
            usdcContractAddress, relayerIpfsId, rpcChain, rpcChainId,
            secureSessionId, sessionIdAndDurationSig: requestedSessionDurationLearnerSig, learnerAddress, duration, env,
            // Add PKP information
            relayerPkpTokenId,
            relayerAddress: spender,
            relayerPublicKey
          }
        });

        console.log("Got result from permit action:", {
          success: result.success,
          responseType: typeof result.response,
          responsePreview: typeof result.response === 'string' ? result.response : null,
          error: result.error
        });

        // Verify the action succeeded
        if (!result.success) {
          console.error("Permit action failed with error:", result.error);
          throw new Error('Permit action returned failure status');
        }

        // Basic sanity check on the response
        if (typeof result.response !== 'string') {
          console.error("Unexpected response type:", typeof result.response);
          throw new Error(`Unexpected response type: ${typeof result.response}`);
        }

        console.log("Raw response from permit action:", result.response);

        // Simple approach for consistent extraction
        const responseStr = result.response.toString();

        // Check if the response itself is the hash (starts with 0x and has ~66 chars)
        if (responseStr.startsWith('0x') && responseStr.length >= 66) {
          console.log("Response appears to be a direct transaction hash");
          return { txHash: responseStr.substring(0, 66) };
        }

        // If the response has quotes, it might be a JSON string
        if (responseStr.includes('"')) {
          try {
            // Remove any extra quotes or formatting
            const cleaned = responseStr.replace(/^["']+|["']+$/g, '');
            const parsed = JSON.parse(cleaned);

            if (typeof parsed === 'string' && parsed.startsWith('0x')) {
              console.log("Found hash in parsed JSON string:", parsed);
              return { txHash: parsed };
            }

            if (parsed && typeof parsed === 'object') {
              const hash =
                parsed.txHash ||
                  parsed.hash ||
                  parsed.transactionHash ||
                  (typeof parsed.response === 'string' && parsed.response.startsWith('0x') ? parsed.response : null);

              if (hash) {
                console.log("Found hash in parsed JSON object:", hash);
                return { txHash: hash };
              }
            }
          } catch (e) {
            console.log("JSON parsing failed, will try regex extraction");
          }
        }

        // Fallback to regex extraction
        const hashMatch = responseStr.match(/0x[a-fA-F0-9]{64}/);
        if (hashMatch) {
          console.log("Extracted tx hash using regex:", hashMatch[0]);
          return { txHash: hashMatch[0] };
        }

        // If we got here, we don't have a transaction hash - try using a hardcoded hash for debugging
        console.error("Could not extract a transaction hash from response");
        throw new Error("Could not extract transaction hash from response");
      } catch (error) {
        console.error("Error in permit action execution:", error);
        throw new Error(`Permit action failed: ${error.message}`);
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
      learnerSessionDurationSig: requestedSessionDurationLearnerSig,
      sessionDurationData,
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
          requested_session_duration_learner_sig: requestedSessionDurationLearnerSig,
          secure_session_id: secureSessionId,
          learner_address_encrypt_hash: dataToEncryptHash,
          learner_address_cipher_text: ciphertext,
          session_duration_data: sessionDurationData
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
