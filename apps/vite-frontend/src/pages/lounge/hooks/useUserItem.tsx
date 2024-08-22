// useUserItem.ts
import { useState, useMemo, useCallback } from 'react';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { ethers, BigNumberish, SignatureLike } from 'ethers';
import { usePreCalculateTimeDate } from './usePreCalculateTimeDate';
import { usePkpWallet, useLitAccount, useSupabaseClient, useSessionSigs } from '@/contexts/AuthContext';
import { litNodeClient } from '@/utils/litClients';
import { convertLocalTimetoUtc } from '@/utils/app';

// Define the return type of useUserItem
type ControllerData = {
  controller_claim_user_id: string;
  controller_address: string;
  controller_public_key: string;
  claim_key_id: string;
};

interface SubmitLearningRequest {
  dateTime: string;
  teacherID: number;
  userID: number;
  teachingLang: string;
  sessionDuration: number;
  learnerSignedSessionDuration: SignatureLike;
  secureSessionId: string;
}

interface UseUserItemReturn {
  learningRequestState: {
    sessionLengthInputValue: string;
    setSessionLengthInputValue: React.Dispatch<React.SetStateAction<string>>;
    toggleDateTimePicker: boolean;
    setToggleDateTimePicker: React.Dispatch<React.SetStateAction<boolean>>;
    renderSubmitConfirmation: boolean;
    setRenderSubmitConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
    dateTime: string;
    setDateTime: React.Dispatch<React.SetStateAction<string>>;
    sessionDuration: number;
    amount: BigNumberish;
  };
  signSessionDuration: UseMutationResult<SignatureLike, unknown, { duration: number; secureSessionId: string }, unknown>;
  executeApproveFundControllerAction: UseMutationResult<void, unknown, ExecuteApproveFundControllerActionParams, unknown>;
  submitLearningRequest: UseMutationResult<boolean, unknown, {
    dateTime: string;
    teacherID: number;
    userID: number;
    teachingLang: string;
    sessionDuration: number;
    learnerSignedSessionDuration: SignatureLike;
    secureSessionId: string;
    controllerData: ControllerData;
  }, unknown>;
  generateControllerData: () => ControllerData;
}
interface ExecuteApproveFundControllerActionParams {
  spenderAddress: string,
  amount: BigNumberish
  sig: SignatureLike;
  secureSessionId: string;
}

export const useUserItem = (isLearnMode: boolean): UseUserItemReturn | null => {
  if (!isLearnMode) return null;
  const { data: supabaseClient } = useSupabaseClient();
  const { data: sessionSigs} = useSessionSigs();
  const { data: currentAccount} = useLitAccount();
  const { data: pkpWallet } = usePkpWallet();

  const [sessionLengthInputValue, setSessionLengthInputValue] = useState<string>("20");
  const [toggleDateTimePicker, setToggleDateTimePicker] = useState(false);
  const [renderSubmitConfirmation, setRenderSubmitConfirmation] = useState(false);
  const { dateTime, setDateTime } = usePreCalculateTimeDate();

  const sessionDuration = useMemo(() =>
    sessionLengthInputValue ? parseInt(sessionLengthInputValue) : 0,
    [sessionLengthInputValue]
  );

  const amount = useMemo(() => ethers.parseUnits(String(sessionDuration * 0.3), 6) as BigNumberish, [sessionDuration]);


  const generateControllerData = useCallback((): ControllerData => {
    const ipfs_cid = import.meta.env.VITE_LIT_ACTION_IPFS_CID_TRANSFER_FROM_LEARNER;
    const uniqueData = `ControllerPKP_${Date.now()}`;
    const bytes = ethers.toUtf8Bytes(uniqueData);
    const userId = ethers.keccak256(bytes);
    const keyId = litNodeClient.computeHDKeyId(userId, ipfs_cid, true);
    const publicKey = litNodeClient.computeHDPubKey(keyId);
    const claimKeyAddress = ethers.computeAddress("0x" + publicKey);
    console.log('claimKeyAddress', claimKeyAddress);

    return {
      controller_claim_user_id: userId,
      controller_address: claimKeyAddress,
      controller_public_key: publicKey,
      claim_key_id: keyId,
    };
  }, []);

  const signSessionDuration = useMutation({
    mutationFn: async ({ duration, secureSessionId }: { duration: number, secureSessionId: string }) => {
      if (!pkpWallet) throw new Error('Wallet not initialized');
      const encodedData = ethers.concat([
        ethers.toUtf8Bytes(secureSessionId), ethers.toBeHex(duration, 32)
      ]);
      const message = ethers.keccak256(encodedData);
      return await pkpWallet.signMessage(ethers.getBytes(message));
    },
  });

  const executeApproveFundControllerAction = useMutation({
    mutationFn: async ({ spenderAddress, amount, sig, secureSessionId  }: ExecuteApproveFundControllerActionParams ) => {
      const ipfsId = import.meta.env.VITE_APPROVE_SIGNER_ACTION_IPFS_CID;
      const pinataApiCypherText = import.meta.env.VITE_ENCRYPTED_API_KEY_CIPHERTEXT;
      const pinataApiKeyEncryptionHash = import.meta.env.VITE_ENCRYPTED_API_KEY_HASH;

      litNodeClient.executeJs({ipfsId, sessionSigs, jsParams: {
        sig, learnerAddress: currentAccount?.ethAddress, secureSessionId, spenderAddress, amount, /*authSig,*/ learnerPublicKey: currentAccount?.publicKey, pinataApiCypherText, pinataApiKeyEncryptionHash}  })

    },
  });


  const submitLearningRequest = useMutation({
    mutationFn: async ({
      dateTime,
      teacherID,
      userID,
      teachingLang,
      sessionDuration,
      learnerSignedSessionDuration,
      secureSessionId,
      controllerData,
    }: SubmitLearningRequest & { controllerData: ControllerData }) => {
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
          requested_session_duration_learner_sig: learnerSignedSessionDuration,
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
    learningRequestState: {
      sessionLengthInputValue,
      setSessionLengthInputValue,
      toggleDateTimePicker,
      setToggleDateTimePicker,
      renderSubmitConfirmation,
      setRenderSubmitConfirmation,
      dateTime,
      setDateTime,
      sessionDuration,
      amount,
    },
    generateControllerData,
    signSessionDuration,
    executeApproveFundControllerAction,
    submitLearningRequest,
  };
};
