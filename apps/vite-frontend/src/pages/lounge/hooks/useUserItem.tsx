// useUserItem.ts
import { useState, useMemo, useEffect } from 'react';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { ethers, BigNumberish, SignatureLike } from 'ethers';
import { usePreCalculateTimeDate } from './usePreCalculateTimeDate';
import { usePkpWallet, useLitAccount, useSupabaseClient } from '@/contexts/AuthContext';
import { litNodeClient } from '@/utils/litClients';
import { generateUserId, convertLocalTimetoUtc } from '@/utils/app';

// Define the return type of useUserItem
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
  controllerData: {
    controller_claim_user_id: string;
    controller_address: string;
    controller_public_key: string;
    claim_key_id: string;
  };
  signSessionDuration: UseMutationResult<SignatureLike, unknown, { duration: number; secureSessionId: string }, unknown>;
  signApproveFundController: UseMutationResult<string, unknown, { contractAddress: string; spenderAddress: string; amount: BigNumberish }, unknown>;
  submitLearningRequest: UseMutationResult<boolean, unknown, {
    dateTime: string;
    teacherID: number;
    userID: number;
    teachingLang: string;
    sessionDuration: number;
    learnerSignedSessionDuration: SignatureLike;
    secureSessionId: string;
  }, unknown>;
}

export const useUserItem = (isLearnMode: boolean, userID: number, lang: string, loggedInUserId: number | null): UseUserItemReturn | null => {
  if (!isLearnMode) return null;

  const [sessionLengthInputValue, setSessionLengthInputValue] = useState<string>("20");
  const [toggleDateTimePicker, setToggleDateTimePicker] = useState(false);
  const [renderSubmitConfirmation, setRenderSubmitConfirmation] = useState(false);
  const { dateTime, setDateTime } = usePreCalculateTimeDate();

  const sessionDuration = useMemo(() =>
    sessionLengthInputValue ? parseInt(sessionLengthInputValue) : 0,
    [sessionLengthInputValue]
  );

  const amount = useMemo(() => sessionDuration * 0.3 as BigNumberish, [sessionDuration]);

  // Controller Address
  const [controllerData, setControllerData] = useState({
    controller_claim_user_id: '',
    controller_address: '',
    controller_public_key: '',
    claim_key_id: '',
  });

  useEffect(() => {
    const ipfs_cid = import.meta.env.VITE_LIT_ACTION_IPFS_CID_TRANSFER_FROM_LEARNER;
    if (!ipfs_cid) throw new Error('missing ipfs_cid env');
    const userId = generateUserId();
    const keyId = litNodeClient.computeHDKeyId(userId, ipfs_cid, true);
    const publicKey = litNodeClient.computeHDPubKey(keyId);
    const claimKeyAddress = ethers.computeAddress("0x" + publicKey);
    setControllerData({
      controller_claim_user_id: userId,
      controller_address: claimKeyAddress,
      controller_public_key: publicKey,
      claim_key_id: keyId,
    });
  }, []);

  // Sign Session Duration
  const { data: pkpWallet } = usePkpWallet();
  const signSessionDuration = useMutation({
    mutationFn: async ({ duration, secureSessionId }: { duration: number, secureSessionId: string }) => {
      if (!pkpWallet) throw new Error('Wallet not initialized');
      const encodedData = ethers.concat([
        ethers.toUtf8Bytes(secureSessionId),
        ethers.toBeHex(duration, 32)
      ]);
      const message = ethers.keccak256(encodedData);
      return await pkpWallet.signMessage(ethers.getBytes(message));
    },
  });

  // Sign Approve Fund Controller
  const signApproveFundController = useMutation({
    mutationFn: async ({ contractAddress, spenderAddress, amount }: { contractAddress: string, spenderAddress: string, amount: BigNumberish }) => {
      if (!pkpWallet || !contractAddress || !amount) throw new Error('Invalid parameters');
      const erc20AbiFragment = ["function approve(address spender, uint256 amount) returns (bool)"];
      const iface = new ethers.Interface(erc20AbiFragment);
      const data = iface.encodeFunctionData("approve", [spenderAddress, amount]);
      const tx = { to: contractAddress, data: data };
      return await pkpWallet.signTransaction(tx);
    },
  });

  // Submit Learning Request
  const { data: currentAccount } = useLitAccount();
  const { data: supabaseClient } = useSupabaseClient();
  const submitLearningRequest = useMutation({
    mutationFn: async ({
      dateTime,
      teacherID,
      userID,
      teachingLang,
      sessionDuration,
      learnerSignedSessionDuration,
      secureSessionId,
    }: {
      dateTime: string;
      teacherID: number;
      userID: number;
      teachingLang: string;
      sessionDuration: number;
      learnerSignedSessionDuration: SignatureLike;
      secureSessionId: string;
    }) => {
      if (!supabaseClient || !currentAccount) throw new Error('Supabase client or current account not available');
      const utcDateTime = convertLocalTimetoUtc(dateTime);
      let hashed_learner_address = ethers.keccak256(currentAccount.ethAddress);
      const { data, error } = await supabaseClient
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
    controllerData,
    signSessionDuration,
    signApproveFundController,
    submitLearningRequest,
  };
};
