import ky from 'ky';
import { useRoom } from '@huddle01/react/hooks';
import { useEffect, useState } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import useBellListener from '../../hooks/Room/useBellListener';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { RoomProps, TimestampResponse } from '../../types/types';
import { checkHashedAddress, checkSessionCompleted } from '../../utils/app';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import {useStoreRoomJoinData}  from '../../hooks/Supabase/DbCalls/useStoreRoomJoinData'
import { useStoreRoomLeftData } from '../../hooks/Supabase/DbCalls/useStoreRoomLeftData';
import useThreeMinTimer from '../../hooks/Room/useThreeMinTimer';
import { useSessionContext } from '../../contexts/SessionsContext';
import { useSessionTimer } from '../../hooks/Room/useSessionTimer';
import { useCallAndExecuteTransferControllerToTeacher } from '../../hooks/Room/useCallAndExecuteTransferControllerToTeacher';

const Room  = ( {match, location}: RoomProps) => {
  const roomId = match.params.id
  const {roomRole} = location.state;
  const {notification: {requested_session_duration }} = location.state;
  const [ huddleAccessToken ] = useLocalStorage<string>('huddle-access-token');
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs');
  const [signedJoinSignature, setSignedJoinSignature] = useState<string | null>(null);
  const { storeRoomJoinData } = useStoreRoomJoinData();
  const { storeRoomLeftData } = useStoreRoomLeftData()

  const {threeMinElapsed, startTimer } = useThreeMinTimer();
  const {sessionData} = useSessionContext();
  const { bothWsConnected, timerWebsocket, submitSignature, timerInitiated, initTimestamp, initTimestampSig, timerExpired, expiredTimestamp, expiredTimestampSig } = useSessionTimer(roomRole, sessionData);
  const actionResult = useCallAndExecuteTransferControllerToTeacher(roomRole, timerInitiated, initTimestamp, initTimestampSig, timerExpired, expiredTimestamp,expiredTimestampSig,);
  const { joinRoom, leaveRoom, state: roomJoinState} = useRoom({
    onJoin: () => { setOnJoinCalled(true); },
    onLeave: () => { setOnLeaveCalled(true); }
  });

  const [onJoinCalled, setOnJoinCalled ] = useState(false);
  const [ onJoinRoom, setOnJoinRoom ] = useState(false);
  const [ onLeaveCalled, setOnLeaveCalled ] = useState(false);
  const [onLeaveGracefully, setOnLeaveGracefully ]  = useState(false);

  useEffect(() => {
    if (onJoinCalled && !onJoinRoom) {
      (async () => {
        if (sessionSigs && currentAccount && location.state.notification.session_id && timerWebsocket){
          const session_id = location.state.notification.session_id;
          const pkpWallet = new PKPEthersWallet({controllerSessionSigs: sessionSigs, pkpPubKey: currentAccount.publicKey})
          await pkpWallet.init()
          const timestampRes = await ky.get('https://sign-timestamp.zach-greco.workers.dev').json<TimestampResponse>();
          const {timestamp: joinedTimestamp, signature: joinedTimestampWorkerSig} = timestampRes
          const sigRes = await pkpWallet.signMessage(joinedTimestamp + roomRole + location.state.notification.requested_session_duration);
          setSignedJoinSignature(sigRes);
          storeRoomJoinData(joinedTimestamp, signedJoinSignature, roomRole,
            joinedTimestampWorkerSig, session_id);
          startTimer();
          if (roomRole === 'teacher' && threeMinElapsed && signedJoinSignature && joinedTimestampWorkerSig || !sessionData?.learner_joined_timestamp || !sessionData?.learner_joined_signature || !sessionData?.learner_joined_timestamp_worker_sig || !sessionData?.requested_session_duration){
            //learner fault case
          } else if(roomRole === 'learner' && threeMinElapsed && signedJoinSignature && joinedTimestampWorkerSig || !sessionData?.teacher_joined_timestamp || !sessionData?.teacher_joined_signature || !sessionData?.teacher_joined_timestamp_worker_sig || !sessionData?.requested_session_duration) {
            // teacher fault case
            console.log('threeMinElapsed and no teacher sigs')
          } else if (roomRole === 'teacher' && !threeMinElapsed && signedJoinSignature && joinedTimestampWorkerSig && sessionData?.learner_joined_timestamp && sessionData?.learner_joined_signature && sessionData?.learner_joined_timestamp_worker_sig && sessionData?.requested_session_duration) {
            if (!bothWsConnected) {
              console.log('threeMinElapsed and no learner ws connection')
              //learner fault case;
            }
            submitSignature()
          } else if (roomRole === 'learner' && !threeMinElapsed && signedJoinSignature && joinedTimestampWorkerSig && sessionData?.teacher_joined_timestamp && sessionData?.teacher_joined_signature && sessionData?.teacher_joined_timestamp_worker_sig && sessionData?.requested_session_duration){
            if (!bothWsConnected) {
              console.log('threeMinElapsed and no teacher ws connection')
              //teacher fault case;
            }
            submitSignature()
          }
        }
      })();
      console.log('Joined the room');
      setOnJoinRoom(true);
    }
  }, [onJoinCalled, onJoinRoom, threeMinElapsed, sessionData?.learner_joined_timestamp_worker_sig, sessionData?.teacher_joined_timestamp_worker_sig])

  useEffect(() => {
    let hashed_learner_address;
    let hashed_teacher_address;
    if (roomId &&
      huddleAccessToken &&
      roomJoinState === 'idle' &&
      currentAccount &&
      checkHashedAddress(currentAccount, roomRole, hashed_learner_address, hashed_teacher_address) &&
      bothWsConnected
    ) {
      joinRoom({roomId, token: huddleAccessToken})
    }
  }, [ huddleAccessToken, roomJoinState, sessionData?.hashed_learner_address, sessionData?.hashed_teacher_address, bothWsConnected ]);


  useEffect(() => {
    //intentional leaveRoom
    if (onLeaveCalled && !onLeaveGracefully) {
      // rejoin time set for 90 seconds
    }
    if (onLeaveCalled && onLeaveGracefully  ) {
      (async () => {
        if (sessionSigs && currentAccount && location.state.notification.session_id){
          const session_id = location.state.notification.session_id;
          const pkpWallet = new PKPEthersWallet({controllerSessionSigs: sessionSigs, pkpPubKey: currentAccount.publicKey});
          await pkpWallet.init();
          const timestampRes = await ky.get('https://sign-timestamp.zach-greco.workers.dev').json<TimestampResponse>();
          const {timestamp: leftTimestamp, signature: leftTimestampWorkerSig} = timestampRes
          const sigRes = await pkpWallet.signMessage(leftTimestamp + roomRole);
          await storeRoomLeftData (leftTimestamp, sigRes, roomRole, leftTimestampWorkerSig, session_id)
        }
      })();
      console.log('Left the room');
      setOnLeaveRoom(true);
    }
  }, [onLeaveCalled, onLeaveGracefully])


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
