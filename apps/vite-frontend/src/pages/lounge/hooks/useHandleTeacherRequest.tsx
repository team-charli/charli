import {ethers} from 'ethers'
import { fetchLearnerToControllerParams } from "@/Supabase/DbCalls/fetchLearnerToControllerParams";
import { useTeacherSignRequestedSessionDuration } from "./Confirm/useTeacherSignRequestedSessionDuration";
import { useLitAccount, useSessionSigs, useSupabaseClient } from "@/contexts/AuthContext";
import { teacherChangeDateTime, teacherConfirmRequestDb, teacherRejectRequest } from "@/Supabase/DbCalls/teacherConfirmRejectReschedule";
import ky from "ky";
import { calculateSessionCost } from "@/utils/app";
import { Dispatch, SetStateAction, useState } from "react";
import { NotificationIface } from "@/types/types";
import { useExecuteTransferFromLearnerToController } from './LitActions/useExecuteTransferFromLearnerToController';

export const useHandleTeacherRequest = (
  notification: NotificationIface,
  dateTime: string,
  setUiCondition: Dispatch<SetStateAction<'initial' | 'confirmed' | 'rejectOptions' | 'changingTime'>>
) => {
  const executeTransferFromLearnerToController = useExecuteTransferFromLearnerToController();
  const [hashedTeacherAddress, setHashedTeacherAddress] = useState<string>();
  const {data: supabaseClient} = useSupabaseClient();
  const {data: currentAccount} = useLitAccount();
  const {data: sessionSigs} = useSessionSigs();
  const { signSessionDuration, isLoading, isError, error } = useTeacherSignRequestedSessionDuration();

  if (!supabaseClient) throw new Error(`no supabaseClient`)
  if (!currentAccount) throw new Error('no currentAccount')
  if (!sessionSigs) throw new Error(`no sessionSigs`)

  const handleTeacherChoice = async (action: string) => {
    switch (action) {
      case 'accept':
        try {
          const {
            controllerPublicKey,
            controllerAddress,
            learnerAddress,
            requestedSessionDuration,
            keyId,
            requestedSessionDurationLearnerSig,
            hashedLearnerAddress,
            secureSessionId
          } = await fetchLearnerToControllerParams(supabaseClient, notification.session_id);

          const session = await supabaseClient.auth.getSession()
          console.log('session', session)
          console.log('keyId', keyId);
          console.log('typeof keyId', typeof keyId)

          const response = await supabaseClient.functions.invoke('mint-controller-pkp', {
            body: JSON.stringify({ keyId: keyId }),
          });

          console.log('Response data:', response);

          const requestedSessionDurationTeacherSig = await signSessionDuration(
            requestedSessionDurationLearnerSig,
            requestedSessionDuration,
            hashedLearnerAddress,
            secureSessionId
          );
          console.log('{controllerPublicKey && controllerAddress && learnerAddress && requestedSessionDuration && currentAccount && requestedSessionDurationTeacherSig && hashedLearnerAddress && secureSessionId}', {controllerPublicKey , controllerAddress , learnerAddress , requestedSessionDuration, currentAccount, requestedSessionDurationTeacherSig, hashedLearnerAddress, secureSessionId})
          console.log('controllerAddress', controllerAddress)

          if (controllerPublicKey && controllerAddress && learnerAddress && requestedSessionDuration &&
            currentAccount && requestedSessionDurationTeacherSig && hashedLearnerAddress && secureSessionId) {
            const paymentAmount = calculateSessionCost(requestedSessionDuration);
            const newHashedTeacherAddress = ethers.keccak256(ethers.toUtf8Bytes(currentAccount.ethAddress));
            setHashedTeacherAddress(newHashedTeacherAddress);

            const actionResult = await executeTransferFromLearnerToController(
              learnerAddress,
              controllerAddress,
              controllerPublicKey,
              paymentAmount,
              requestedSessionDurationLearnerSig,
              requestedSessionDurationTeacherSig,
              hashedLearnerAddress,
              newHashedTeacherAddress,
              requestedSessionDuration,
              secureSessionId
            );
            console.log('actionResult', actionResult)
          }

          await teacherConfirmRequestDb(
            supabaseClient,
            setUiCondition,
            dateTime,
            notification.session_id,
            currentAccount,
            hashedTeacherAddress
          );
        } catch (error: any) {
          console.error(error);
          throw new Error(`error: ${error.message}`);
        }
        break;
      case 'reject':
        setUiCondition('rejectOptions');
        break;
      case 'reschedule':
        setUiCondition('changingTime');
        break;
    }
  }

  const handleRejectResponse = async (reason: string) => {
    await teacherRejectRequest(supabaseClient, reason);
  };

  const handleSubmitChangeDateTime = async () => {
    await teacherChangeDateTime(supabaseClient, dateTime);
  };

  return {handleTeacherChoice, handleRejectResponse, handleSubmitChangeDateTime, isLoading, isError, error}
}
