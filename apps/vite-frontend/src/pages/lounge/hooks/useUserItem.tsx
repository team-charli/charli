// useUserItem.ts
import { useState, useMemo, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ethers, BigNumberish } from 'ethers';
import { usePreCalculateTimeDate } from './usePreCalculateTimeDate';
import { usePkpWallet, useLitAccount, useSupabaseClient, useSessionSigs } from '@/contexts/AuthContext';
import { litNodeClient } from '@/utils/litClients';
import { convertLocalTimetoUtc } from '@/utils/app';
import { approveSigner } from '../LitActions/approveAction';
import { ControllerData, SubmitLearningRequest, UseUserItemReturn } from '@/types/types';

export const useUserItem = (isLearnMode: boolean): UseUserItemReturn | null => {
  if (!isLearnMode) return null;
  const { data: supabaseClient } = useSupabaseClient();
  const { data: sessionSigs } = useSessionSigs();
  const { data: currentAccount } = useLitAccount();
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
      ethers.toUtf8Bytes(secureSessionId),
      ethers.toBeHex(duration)
    ]);

    const message = ethers.keccak256(encodedData);
    return await pkpWallet.signMessage(ethers.getBytes(message));
  },
});

  const signApproveTransaction = useMutation({
    mutationFn: async (controllerData: ControllerData) => {
      if (!pkpWallet) throw new Error('Wallet not initialized');
      const USDC_CONTRACT_ADDRESS = import.meta.env.VITE_USDC_SEPOLIA_CONTRACT_ADDRESS;
      const tx = {
        to: USDC_CONTRACT_ADDRESS,
        gasLimit: ethers.toBeHex(100000),
        data: new ethers.Interface(["function approve(address spender, uint256 amount)"]).encodeFunctionData("approve", [controllerData.controller_address, amount]),
      };
      return await pkpWallet.signTransaction(tx);
    },
  });

  const executeApproveFundControllerAction = useMutation({
    mutationFn: async (signedTx: string, secureSessionId: string, controllerDatasessionIdAndDurationSig: string, sessionDuration: string )  => {
      const result = await litNodeClient.executeJs({
        ipfsId: "QmR1fbsosSmH76GXUCoW6nRgQei6N9Twm9MsEcH12NnMCX",
        sessionSigs,
        jsParams: {
          signedTx,
          secureSessionId,
          controllerDatasessionIdAndDurationSig,
          sessionDuration
        }
      });
      return result;
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
    signApproveTransaction,
    executeApproveFundControllerAction,
    submitLearningRequest,
    signSessionDuration
  };
};
