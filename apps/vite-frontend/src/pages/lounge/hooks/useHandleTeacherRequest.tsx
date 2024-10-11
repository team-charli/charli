import {ethers} from 'ethers'
import { fetchLearnerToControllerParams } from "@/Supabase/DbCalls/fetchLearnerToControllerParams";
import { useTeacherSignRequestedSessionDuration } from "./Confirm/useTeacherSignRequestedSessionDuration";
import { useLitAccount, usePkpWallet, useSessionSigs, useSupabaseClient } from "@/contexts/AuthContext";
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
  const {data: pkpWallet} = usePkpWallet();
  const teacherAddress = pkpWallet?.address;
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
            requestedSessionDuration,
            keyId,
            requestedSessionDurationLearnerSig,
            hashedLearnerAddress,
            secureSessionId,
            learnerAddressEncryptHash,
            learnerAddressCipherText,
          } = await fetchLearnerToControllerParams(supabaseClient, notification.session_id);

          const session = await supabaseClient.auth.getSession()
          console.log('session', session)
          console.log('keyId', keyId);
          console.log('typeof keyId', typeof keyId)


          ////mintClaimBurn
          let mintClaimResponse: any;
          try {
            mintClaimResponse = await supabaseClient.functions.invoke('mint-controller-pkp', {
              body: JSON.stringify({
                env: "dev",
                sessionId: notification.session_id,
              })
            });
          } catch (error) {
            console.log(error);
          }

          if (Object.keys(mintClaimResponse).length > 1) {
            console.log("success mintClaimResponse")
          }

          console.log('mintClaimResponse: ', mintClaimResponse );

          const requestedSessionDurationTeacherSig = await signSessionDuration(
            requestedSessionDurationLearnerSig,
            requestedSessionDuration,
            hashedLearnerAddress,
            secureSessionId
          );

          if (controllerPublicKey && controllerAddress && teacherAddress && requestedSessionDuration &&
            currentAccount && requestedSessionDurationTeacherSig && hashedLearnerAddress && secureSessionId) {
            const paymentAmount = calculateSessionCost(requestedSessionDuration);
            const newHashedTeacherAddress = ethers.keccak256(ethers.toUtf8Bytes(currentAccount.ethAddress));
            setHashedTeacherAddress(newHashedTeacherAddress);

            const actionResult = await executeTransferFromLearnerToController(
              teacherAddress,
              controllerAddress,
              controllerPublicKey,
              paymentAmount,
              requestedSessionDurationLearnerSig,
              requestedSessionDurationTeacherSig,
              hashedLearnerAddress,
              newHashedTeacherAddress,
              requestedSessionDuration,
              secureSessionId,
              learnerAddressEncryptHash,
              learnerAddressCipherText,

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
