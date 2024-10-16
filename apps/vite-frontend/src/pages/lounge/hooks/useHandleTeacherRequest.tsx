import {AddressLike, ethers} from 'ethers'
import { fetchLearnerToControllerParams } from "@/Supabase/DbCalls/fetchLearnerToControllerParams";
import { useTeacherSignRequestedSessionDuration } from "./Confirm/useTeacherSignRequestedSessionDuration";
import { useLitAccount, usePkpWallet, useSupabaseClient } from "@/contexts/AuthContext";
import { teacherChangeDateTime, teacherConfirmRequestDb, teacherRejectRequest } from "@/Supabase/DbCalls/teacherConfirmRejectReschedule";
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
  const {data: supabaseClient} = useSupabaseClient();
  const {data: currentAccount} = useLitAccount();
  const {data: pkpWallet} = usePkpWallet();
  let teacherAddress: AddressLike;
  if (pkpWallet) {
    teacherAddress = pkpWallet.address;
  }
  const { signSessionDuration, isLoading, isError, error } = useTeacherSignRequestedSessionDuration();

  const handleTeacherChoice = async (action: string) => {
    switch (action) {
      case 'accept':
        try {
          console.log('Starting accept process');
          const {
            controllerAddress,
            requestedSessionDuration,
            requestedSessionDurationLearnerSig,
            hashedLearnerAddress,
            secureSessionId,
            learnerAddressEncryptHash,
            learnerAddressCipherText,
          } = await fetchLearnerToControllerParams(supabaseClient, notification.session_id);
          console.log('Fetched learner to controller params:', { controllerAddress, requestedSessionDuration, hashedLearnerAddress, secureSessionId });

          let mintClaimResponse: any;
          mintClaimResponse = await supabaseClient!.functions.invoke('mint-controller-pkp', {
            body: JSON.stringify({
              env: "dev",
              sessionId: notification.session_id,
            })
          });
          console.log('mintClaimResponse: ', mintClaimResponse);

          const requestedSessionDurationTeacherSig = await signSessionDuration(
            requestedSessionDurationLearnerSig,
            requestedSessionDuration,
            hashedLearnerAddress,
            secureSessionId
          );
          if (!requestedSessionDurationTeacherSig) throw new Error('Failed to sign session duration');
          console.log('Session duration signed successfully');

          if (!pkpWallet) throw new Error('pkpWallet undefined');
          const hashedTeacherAddress = ethers.keccak256(ethers.getAddress(pkpWallet.address));

          console.log('Hashed teacher address, and teacherAddress:', { hashedTeacherAddress, teacherAddress });

          let paymentAmount;
          if (controllerAddress && teacherAddress && requestedSessionDuration && requestedSessionDurationTeacherSig && hashedLearnerAddress && secureSessionId) {
            paymentAmount = calculateSessionCost(requestedSessionDuration.toString());
            console.log("Calling executeTransferFromLearnerToController with paymentAmount: ", paymentAmount);
            try {
              const transferFromResult = await executeTransferFromLearnerToController(
                controllerAddress,
                paymentAmount,
                requestedSessionDurationLearnerSig,
                requestedSessionDurationTeacherSig,
                hashedLearnerAddress,
                hashedTeacherAddress,
                requestedSessionDuration,
                notification.session_id,
                secureSessionId,
                learnerAddressEncryptHash,
                learnerAddressCipherText,
              );
              console.log('Transfer from learner to controller executed successfully, transferFromResult:', transferFromResult);
            } catch (error) {
              console.error('Error executing transfer from learner to controller:', error);
              throw new Error('Failed to execute transfer from learner to controller');
            }
          } else {
            console.error('Missing required parameters for executeTransferFromLearnerToController');
            console.log({controllerAddress, teacherAddress, requestedSessionDuration, requestedSessionDurationTeacherSig, hashedLearnerAddress, secureSessionId});
            throw new Error('Missing required parameters for transfer');
          }

          console.log('Confirming teacher request in DB');
          await teacherConfirmRequestDb(
            supabaseClient,
            setUiCondition,
            dateTime,
            notification.session_id,
            currentAccount,
            hashedTeacherAddress
          );
          console.log('Teacher request confirmed in DB');

        } catch (error: any) {
          console.error('Error in handleTeacherChoice (accept):', error);
          throw new Error(`error: ${error.message}`);
        }
        break;
      case 'reject':
        console.log('Rejecting request');
        setUiCondition('rejectOptions');
        break;
      case 'reschedule':
        console.log('Rescheduling request');
        setUiCondition('changingTime');
        break;
    }
  }

  const handleRejectResponse = async (reason: string) => {
    try {
      await teacherRejectRequest(supabaseClient, reason);
    } catch (error: any) {
      console.error('Error in handleRejectResponse:', error);
      throw error;
    }
  };

  const handleSubmitChangeDateTime = async () => {
    try {
      await teacherChangeDateTime(supabaseClient, dateTime);
    } catch (error: any) {
      console.error('Error in handleSubmitChangeDateTime:', error);
      throw error;
    }
  };

  return {handleTeacherChoice, handleRejectResponse, handleSubmitChangeDateTime, isLoading, isError, error}
}
