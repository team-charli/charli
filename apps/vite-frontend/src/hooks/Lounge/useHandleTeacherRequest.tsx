import {ethers} from 'ethers'
import { fetchLearnerToControllerParams } from "@/Supabase/DbCalls/fetchLearnerToControllerParams";
import { useTeacherSignRequestedSessionDuration } from "./Confirm/useTeacherSignRequestedSessionDuration";
import { useLitAccount, useSupabaseClient } from "@/contexts/AuthContext";
import { teacherChangeDateTime, teacherConfirmRequestDb, teacherRejectRequest } from "@/Supabase/DbCalls/teacherConfirmRejectReschedule";
import ky from "ky";
import { calculateSessionCost } from "@/utils/app";
import { Dispatch, SetStateAction, useState } from "react";
import { NotificationIface } from "@/types/types";
import { useExecuteTransferFromLearnerToController } from '../LitActions/useExecuteTransferFromLearnerToController';

export const useHandleTeacherRequest = (notification: NotificationIface, dateTime: string, setUiCondition: Dispatch<SetStateAction<'initial' | 'confirmed' | 'rejectOptions' | 'changingTime'>>) => {
  const executeTransferFromLearnerToController = useExecuteTransferFromLearnerToController();

  const [hashedTeacherAddress, setHashedTeacherAddress] = useState<string>();
  const {data: supabaseClient} = useSupabaseClient();
  const {data: currentAccount} = useLitAccount();
  if (! currentAccount) throw new Error('no currentAccount')
  if (!supabaseClient) throw new Error(`no supabaseClient`)

  const handleTeacherChoice = async (action: string) => {
    switch (action) {
      case 'accept':

        const { controllerPublicKey, controllerAddress, learnerAddress, requestedSessionDuration, keyId, requestedSessionDurationLearnerSig, hashedLearnerAddress } = await fetchLearnerToControllerParams(supabaseClient, notification.session_id);

        const {requestedSessionDurationTeacherSig} = useTeacherSignRequestedSessionDuration(requestedSessionDurationLearnerSig, requestedSessionDuration, hashedLearnerAddress)

        try {
          await ky.post('https://mint-controller-pkp.zach-greco.workers.dev', {
            json: { keyId },
          })
        } catch (error) {
          console.error(error);
          throw new Error(`error: mint controller pkp`)
        }
        if ( controllerPublicKey && controllerAddress && learnerAddress && requestedSessionDuration && currentAccount && requestedSessionDurationTeacherSig && hashedLearnerAddress){
          const paymentAmount = BigInt(calculateSessionCost(parseInt(requestedSessionDuration)));
          setHashedTeacherAddress(ethers.keccak256(currentAccount?.ethAddress))

          try {
            //TODO: send to relayer
            /* eslint-disable @typescript-eslint/no-unused-vars */
            const actionResult = await executeTransferFromLearnerToController(learnerAddress, controllerAddress, controllerPublicKey, paymentAmount, requestedSessionDurationLearnerSig, requestedSessionDurationTeacherSig, hashedLearnerAddress, hashedTeacherAddress);

          } catch (error) {
            console.error(error);
            throw new Error(`error: executeTransferFromLearnerToController`)
          }
        }
        try {
          await teacherConfirmRequestDb(supabaseClient, setUiCondition, dateTime, notification.session_id, currentAccount, hashedTeacherAddress,);
        } catch (error) {
          console.error(error);
          throw new Error(`${ error }`)
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

  return {handleTeacherChoice, handleRejectResponse, handleSubmitChangeDateTime}
}
