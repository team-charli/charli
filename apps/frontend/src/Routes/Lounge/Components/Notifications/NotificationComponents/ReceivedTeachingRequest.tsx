//TODO: implement address encryption
import ky from 'ky'
import { useState } from "react";
import DateTimeLocalInput from "apps/frontend/src/Components/Elements/DateTimeLocalInput";
import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";
import { useLocalizeAndFormatDateTime } from "apps/frontend/src/hooks/utils/useLocalizeAndFormatDateTime";
import {
  teacherChangeDateTime,
  teacherConfirmRequestDb,
  teacherRejectRequest
} from "apps/frontend/src/Supabase/DbCalls/teacherConfirmRejectReschedule";
import { useExecuteTransferFromLearnerToController } from "apps/frontend/src/hooks/LitActions/useExecuteTransferFromLearnerToController";
import { NotificationIface, defaultSessionParams } from "apps/frontend/src/types/types";
import { fetchLearnerToControllerParams } from "apps/frontend/src/Supabase/DbCalls/fetchLearnerToControllerParams";
import { calculateSessionCost } from "apps/frontend/src/utils/app";
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP } from '@lit-protocol/types';

type ReceivedTeachingRequestProps = {
  notification: NotificationIface;
};
const ReceivedTeachingRequest = ({ notification }: ReceivedTeachingRequestProps) => {
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const [uiCondition, setUiCondition] = useState<'initial' | 'confirmed' | 'rejectOptions' | 'changingTime'>('initial');
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const { dateTime, setDateTime, localTimeAndDate: { displayLocalDate, displayLocalTime } } = useLocalizeAndFormatDateTime(notification.request_time_date);
  const { executeTransferFromLearnerToController } = useExecuteTransferFromLearnerToController();

  const handleTeacherChoice = async (action: string) => {
    if (supabaseClient && !supabaseLoading) {
      switch (action) {
        case 'accept':
          let fetchParamsResult;
          let  controllerPublicKey, controllerAddress, learnerAddress, requestedSessionDuration, keyId;
          try {
            fetchParamsResult = await fetchLearnerToControllerParams(supabaseClient, supabaseLoading, notification.session_id);

            controllerPublicKey = fetchParamsResult.controllerPublicKey;
            controllerAddress = fetchParamsResult.controllerAddress;
            learnerAddress = fetchParamsResult.learnerAddress;
            requestedSessionDuration = fetchParamsResult.requestedSessionDuration;
            keyId = fetchParamsResult.keyId;
          } catch (error) {
            console.error(error);
          }
          try {
            await ky.post('https://mint-controller-pkp.zach-greco.workers.dev', {
              json: { keyId },
            })
          } catch (error) {
            console.error(error);
            throw new Error(`error: mint controller pkp`)
          }
          if ( controllerPublicKey && controllerAddress && learnerAddress && requestedSessionDuration){
            const paymentAmount = BigInt(calculateSessionCost(requestedSessionDuration));
            try {
              await executeTransferFromLearnerToController(learnerAddress, controllerAddress, controllerPublicKey, paymentAmount);

            } catch (error) {
              console.error(error);
              throw new Error(`error: executeTransferFromLearnerToController`)
            }
          }
          try {
            await teacherConfirmRequestDb(supabaseClient, setUiCondition, dateTime, notification.session_id, currentAccount);
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
  }

  const handleRejectResponse = async (reason: string) => {
    await teacherRejectRequest(supabaseClient, reason);
  };

  const handleSubmitChangeDateTime = async () => {
    await teacherChangeDateTime(supabaseClient, dateTime);
  };

  return (
    <ul>
      {uiCondition === 'initial' && (
        <li>
          Confirm meeting with {notification.learnerName} at {displayLocalTime} {displayLocalDate} in {notification.teaching_lang}?
          <div>
            <button onClick={() => handleTeacherChoice('accept')}>Accept</button>
            <button onClick={() => handleTeacherChoice('reject')}>Reject</button>
            <button onClick={() => handleTeacherChoice('reschedule')}>Reschedule</button>
          </div>
        </li>
      )}
      {uiCondition === 'confirmed' && <li>Request confirmed.</li>}
      {uiCondition === 'rejectOptions' && (
        <li>
          <div>
            <p>Reason for rejection:</p>
            <button onClick={() => handleRejectResponse('no_time')}>No free time</button>
            <button onClick={() => handleRejectResponse('no_interest')}>Not interested</button>
            <button onClick={() => handleRejectResponse('other')}>Other reason</button>
          </div>
        </li>
      )}
      {uiCondition === 'changingTime' && (
        <li>
          <DateTimeLocalInput dateTime={dateTime} setDateTime={setDateTime} />
          <button onClick={handleSubmitChangeDateTime}>Submit New Time</button>
        </li>
      )}
    </ul>
  );
};

export default ReceivedTeachingRequest;
