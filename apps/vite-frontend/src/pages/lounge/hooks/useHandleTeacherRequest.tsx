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

  if (!supabaseClient) throw new Error(`no supabaseClient`)
  if (!currentAccount) throw new Error('no currentAccount')
  if (!sessionSigs) throw new Error(`no sessionSigs`)

  const handleTeacherChoice = async (action: string) => {
    switch (action) {
      case 'accept':
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

try {
  const session = await supabaseClient.auth.getSession()
  console.log('session', session)
  console.log('keyId', keyId);
  console.log('typeof keyId', typeof keyId)

const response = await supabaseClient.functions.invoke('mint-controller-pkp', {
  body: JSON.stringify({ keyId: keyId }),
});

// const localFunctionUrl = 'http://127.0.0.1:54321/functions/v1/mint-controller-pkp';

// const response = await fetch(localFunctionUrl, {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   body: JSON.stringify({ keyId: keyId }),
// });

  console.log('Response data:', response);
} catch (error) {
  console.error('Error details:', error);
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('Error response:', await error.response.text());
  }
  throw new Error(`error: mint controller pkp`);
}

        const {requestedSessionDurationTeacherSig} = useTeacherSignRequestedSessionDuration(
          requestedSessionDurationLearnerSig,
          requestedSessionDuration,
          hashedLearnerAddress,
          secureSessionId  // Pass secureSessionId here
        )

        if (controllerPublicKey && controllerAddress && learnerAddress && requestedSessionDuration &&
            currentAccount && requestedSessionDurationTeacherSig && hashedLearnerAddress && secureSessionId) {
          const paymentAmount = BigInt(calculateSessionCost(parseInt(requestedSessionDuration)));
          setHashedTeacherAddress(ethers.keccak256(ethers.toUtf8Bytes(currentAccount.ethAddress)))
          try {
            const actionResult = await executeTransferFromLearnerToController(
              learnerAddress,
              controllerAddress,
              controllerPublicKey,
              paymentAmount,
              requestedSessionDurationLearnerSig,
              requestedSessionDurationTeacherSig,
              hashedLearnerAddress,
              hashedTeacherAddress,
              requestedSessionDuration,
              secureSessionId
            );
            console.log('actionResult', actionResult)
          } catch (error) {
            console.error(error);
            throw new Error(`error: executeTransferFromLearnerToController`)
          }
        }

        try {
          await teacherConfirmRequestDb(
            supabaseClient,
            setUiCondition,
            dateTime,
            notification.session_id,
            currentAccount,
            hashedTeacherAddress
          );
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
