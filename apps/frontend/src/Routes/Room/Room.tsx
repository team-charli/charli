import { useRoom } from '@huddle01/react/hooks';
import { useEffect, useState } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import useBellListener from '../../hooks/Room/useBellListener';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { useExecuteTransferControllerToTeacher } from '../../hooks/LitActions/useExecuteTransferControllerToTeacher';
import { RoomProps } from '../../types/types';
import { calculateSessionCost, checkHashedAddress } from '../../utils/app';
import { useCheckHasPrePaid } from '../../hooks/Room/useCheckHasPrePaid';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useSessionContext } from '../../contexts/SessionsContext';
import {useStoreJoinData}  from '../../hooks/Supabase/DbCalls/useStoreJoinData'
import { useFetchLearnerToControllerParams } from '../../hooks/Supabase/DbCalls/useFetchLearnerToControllerParams';


const Room  = ( {match, location}: RoomProps) => {
  const roomId = match.params.id
  const [ huddleAccessToken ] = useLocalStorage<string>('huddle-access-token');
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs');
  const { executeTransferControllerToTeacher } = useExecuteTransferControllerToTeacher();
  const {fetchLearnerToControllerParams} = useFetchLearnerToControllerParams()
  const [signedJoinSignature, setSignedJoinSignature] = useState<string | null>(null);
  const { sessionData } = useSessionContext();
  //TODO: controller_auth_sig
  if (!location.state.notification) throw new Error(`location.state.notificationundefined`)
  if (!location.state.notification.teacher_address_encrypted) throw new Error(`teacher_address_encrypted is undefined`)
  const {notification: {
    learner_id,
    learnerName,
    teacher_id,
    teacherName,
    request_origin_type,
    requested_session_duration,
    request_time_date,
    hashed_learner_address,
    hashed_teacher_address,
    session_id,
    controller_address,
    controller_public_key,
    // controller_auth_sig,

    learner_address_encrypted,
    teacher_address_encrypted,
  }} = location.state;
  const {roomRole} = location.state;
  const hasPrepaid = useCheckHasPrePaid(controller_address, requested_session_duration)
  const { storeJoinData } = useStoreJoinData();
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  useEffect(() => {
    if (
      sessionData?.learner_joined_timestamp &&
        sessionData?.learner_joined_signature &&
        sessionData?.teacher_joined_timestamp &&
        sessionData?.teacher_joined_signature &&

        sessionData?.learner_left_timestamp &&
        sessionData?.learner_left_signature &&
        sessionData?.teacher_left_timestamp &&
        sessionData?.teacher_left_signature
    ) {
      setIsSessionComplete(true);
    }
  }, [sessionData]);

  useEffect(() => {
    if (isSessionComplete && sessionData) {
      const {learner_joined_timestamp, learner_joined_signature, teacher_joined_timestamp, teacher_joined_signature, learner_left_timestamp, learner_left_signature, teacher_left_timestamp, teacher_left_signature, hashed_learner_address,hashed_teacher_address, controller_address, controller_public_key,
      } = sessionData;                                                                                                                                    const paymentAmount = calculateSessionCost(requested_session_duration);

      (async () => {
        //get from notification?
        // const encryptedAddressResults = await fetchLearnerToControllerParams(session_id);
        // if (!encryptedAddressResults) throw Error(`problem obtaining encrypted adddresses`)
        // const teacher_address_encrypted = encryptedAddressResults.teacher_address_encrypted;

        await executeTransferControllerToTeacher(
          teacher_address_encrypted,
          hashed_learner_address,
          hashed_teacher_address,
          controller_address,
          controller_public_key,
          paymentAmount,

          learner_joined_timestamp,
          learner_joined_signature,

          teacher_joined_timestamp,
          teacher_joined_signature,

          learner_left_timestamp,
          learner_left_signature,

          teacher_left_timestamp,
          teacher_left_signature
        );
      })();
    }
  }, [isSessionComplete]);

  const { joinRoom, leaveRoom, state: roomJoinState} = useRoom({
    onJoin: () => {
      (async () => {
        if (sessionSigs && currentAccount){
          const pkpWallet = new PKPEthersWallet({controllerSessionSigs: sessionSigs, pkpPubKey: currentAccount.publicKey})
          await pkpWallet.init()
          const currentTime = new Date();
          const joinedTimestamp = currentTime.toISOString();
          const sigRes = await pkpWallet.signMessage(joinedTimestamp + roomRole);
          setSignedJoinSignature(sigRes);
          storeJoinData(joinedTimestamp, signedJoinSignature, roomRole, session_id)
        }
      })();
      //NOTE: reconcile lit action access controll condition abilities for:
      // verify signatures
      // both signed session completed
      //TODO: edge cases
      console.log('Joined the room');
    },
    onLeave: () => {
      //rejoin time expires
      (async () => {
        if (sessionSigs && currentAccount){
          const pkpWallet = new PKPEthersWallet({controllerSessionSigs: sessionSigs, pkpPubKey: currentAccount.publicKey})
          await pkpWallet.init()
          const currentTime = new Date();
          const leftTimestamp = currentTime.toISOString();
          const sigRes = await pkpWallet.signMessage(leftTimestamp + roomRole);
          await storeJoinData(leftTimestamp, sigRes, roomRole, session_id)
        }
      })();
      console.log('Left the room');
    },
  });

  useEffect(() => {
    if (roomId &&
      huddleAccessToken &&
      roomJoinState === 'idle' &&
      currentAccount &&
      checkHashedAddress(currentAccount, roomRole, hashed_learner_address, hashed_teacher_address ) &&
      hasPrepaid
    ) {
      joinRoom({roomId, token: huddleAccessToken})
    }
  }, [huddleAccessToken, roomJoinState, hasPrepaid]);

  const swapWindowViews = () => {
    //TODO: implement
  }

  useBellListener();

  return (
    <>
      {/*make small */}
      <div onClick={swapWindowViews} className="__localVideo">
        <LocalPeer roomJoinState={roomJoinState} />
      </div>
      <div className="__remoteVideo">
        {/*make large */}
        <RemotePeer />
      </div>
    </>

  )
}

export default Room
