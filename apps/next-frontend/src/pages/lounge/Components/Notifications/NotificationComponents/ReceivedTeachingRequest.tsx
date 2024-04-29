import ky from 'ky'
import ethers, { SignatureLike } from 'ethers'
import { useState } from "react";
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { NotificationIface } from '@/types/types';
import { useSupabase } from '@/contexts';
import { useLocalizeAndFormatDateTime } from '@/hooks/utils/useLocalizeAndFormatDateTime';
import { useExecuteTransferFromLearnerToController } from '@/hooks/LitActions/useExecuteTransferFromLearnerToController';
import { fetchLearnerToControllerParams } from '@/Supabase/DbCalls/fetchLearnerToControllerParams';
import { calculateSessionCost } from '@/utils/app';
import { teacherChangeDateTime, teacherConfirmRequestDb, teacherRejectRequest } from '@/Supabase/DbCalls/teacherConfirmRejectReschedule';
import DateTimeLocalInput from '@/components/elements/DateTimeLocalInput';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';

type ReceivedTeachingRequestProps = {
  notification: NotificationIface;
};
const ReceivedTeachingRequest = ({ notification }: ReceivedTeachingRequestProps) => {
  const [requestedSessionDurationTeacherSig, setRequestedSessionDurationTeacherSig] = useState<SignatureLike>();
  const [hashedTeacherAddress, setHashedTeacherAddress] = useState<string>();
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const [uiCondition, setUiCondition] = useState<'initial' | 'confirmed' | 'rejectOptions' | 'changingTime'>('initial');
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs');
  const { dateTime, setDateTime, localTimeAndDate: { displayLocalDate, displayLocalTime } } = useLocalizeAndFormatDateTime(notification.request_time_date);
  const { executeTransferFromLearnerToController } = useExecuteTransferFromLearnerToController();

  const handleTeacherChoice = async (action: string) => {
    if (supabaseClient && !supabaseLoading) {
      switch (action) {
        case 'accept':
          let fetchParamsResult;
          let  controllerPublicKey, controllerAddress, learnerAddress, requestedSessionDuration, requestedSessionDurationLearnerSig, keyId, hashedLearnerAddress;
          try {
            fetchParamsResult = await fetchLearnerToControllerParams(supabaseClient, supabaseLoading, notification.session_id);

            controllerPublicKey = fetchParamsResult.controllerPublicKey;
            controllerAddress = fetchParamsResult.controllerAddress;
            learnerAddress = fetchParamsResult.learnerAddress;
            requestedSessionDuration = fetchParamsResult.requestedSessionDuration ;
            keyId = fetchParamsResult.keyId;
            requestedSessionDurationLearnerSig = fetchParamsResult.requestedSessionDurationLearnerSig as SignatureLike;
            hashedLearnerAddress = fetchParamsResult.hashedLearnerAddress;
          } catch (error) {
            console.error(error);
          }
          try {
            if (currentAccount && sessionSigs) {
              const pkpWallet = new PKPEthersWallet({
                pkpPubKey: currentAccount.publicKey,
                controllerSessionSigs: sessionSigs,
              })
              if (!requestedSessionDurationLearnerSig) throw new Error('requestedSessionDurationLearnerSig undefined')
              if (!requestedSessionDuration) throw new Error('requestedSessionDuration undefined')
              const recoveredLearnerAddress = ethers.verifyMessage(String(requestedSessionDuration), requestedSessionDurationLearnerSig)
              if (hashedLearnerAddress !== ethers.keccak256(recoveredLearnerAddress)) {

                // throw new Error(`Unable to verify learner signed requestedSessionDuration: {requestedSessionDuration:` + 'requestedSessionDuration}, requestedSessionDurationLearnerSig: ${requestedSessionDurationLearnerSig}, recoveredLearnerAddress: ${recoveredLearnerAddress}, hashedLearnerAddress: ${hashedLearnerAddress}}`)
              }
              await pkpWallet.init();
              const _requestedSessionDurationTeacherSig =  await pkpWallet.signMessage(requestedSessionDuration)
              setRequestedSessionDurationTeacherSig(_requestedSessionDurationTeacherSig)
            }
          } catch (e) {

          }
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
            <button onClick={() => void handleTeacherChoice('accept')}>Accept</button>
            <button onClick={() => void handleTeacherChoice('reject')}>Reject</button>
            <button onClick={() => void handleTeacherChoice('reschedule')}>Reschedule</button>
          </div>
        </li>
      )}
      {uiCondition === 'confirmed' && <li>Request confirmed.</li>}
      {uiCondition === 'rejectOptions' && (
        <li>
          <div>
            <p>Reason for rejection:</p>
            <button onClick={() => void handleRejectResponse('no_time')}>No free time</button>
            <button onClick={() => void handleRejectResponse('no_interest')}>Not interested</button>
            <button onClick={() => void handleRejectResponse('other')}>Other reason</button>
          </div>
        </li>
      )}
      {uiCondition === 'changingTime' && (
        <li>
          <DateTimeLocalInput dateTime={dateTime} setDateTime={setDateTime} />
          <button onClick={() => void handleSubmitChangeDateTime()}>Submit New Time</button>
        </li>
      )}
    </ul>
  );
};

export default ReceivedTeachingRequest;
