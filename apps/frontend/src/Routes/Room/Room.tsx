import ky from 'ky';
import { useRoom } from '@huddle01/react/hooks';
import { useEffect, useState } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import useBellListener from '../../hooks/Room/useBellListener';
import { RoomProps  } from '../../types/types';
// import {useStoreRoomJoinData}  from '../../hooks/Supabase/DbCalls/useStoreRoomJoinData'
import { useSessionContext } from '../../contexts/SessionsContext';
import { useCallAndExecuteTransferControllerToTeacher } from '../../hooks/Room/useCallAndExecuteTransferControllerToTeacher';
import { Redirect } from 'react-router-dom';
import { useVerifyRoleAndAddress } from '../../hooks/Room/useVerifyRoleAndAddress';
import useSessionManager from '../../hooks/Room/useSessionManager';
import useSessionCases from '../../hooks/Room/useSessionCases';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';

const Room  = ( {match, location}: RoomProps) => {
  const roomId = match.params.id
  const {roomRole} = location.state;
  const {notification : {session_id, hashed_learner_address, hashed_teacher_address }} = location.state;
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount')
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs')
  // const { storeRoomJoinData } = useStoreRoomJoinData();
  // const {sessionData} = useSessionContext();
  const { notification } = location.state;
  const [ huddleAccessToken ] = useLocalStorage<string>('huddle-access-token');
  const { verifyRoleAndAddress } = useVerifyRoleAndAddress()
  const [onJoinCalled, setOnJoinCalled ] = useState(false);
  const [ onLeaveCalled, setOnLeaveCalled ] = useState(false);
  const [onLeaveGracefully, setOnLeaveGracefully ]  = useState(false);
  const sessionManager = useSessionManager({clientSideRoomId: roomId, hashedLearnerAddress: hashed_learner_address, hashedTeacherAddress: hashed_teacher_address, userAddress: currentAccount?.ethAddress, sessionSigs, currentAccount});
  const userIPFSData = useSessionCases(sessionManager.messages);
/*
  clientSideRoomId,
  hashedTeacherAddress,
  hashedLearnerAddress,
  userAddress,
*/

  const actionResult = useCallAndExecuteTransferControllerToTeacher(roomRole, timerInitiated, initTimestamp, initTimestampSig, timerExpired, expiredTimestamp,expiredTimestampSig,setOnLeaveGracefully );
  // TODO: generalize relayer
  // TODO: send actionResult with relayer

  useEffect(() => {
    if (roomId &&
      huddleAccessToken &&
      roomJoinState === 'idle' &&
      verifyRoleAndAddress(hashed_teacher_address, hashed_learner_address, roomRole  ) &&
      bothWsConnected
    ) {
      joinRoom({roomId, token: huddleAccessToken})
    }
  }, [ huddleAccessToken, roomJoinState, notification.hashed_learner_address, notification.hashed_teacher_address, bothWsConnected ]);

  const { joinRoom, leaveRoom, state: roomJoinState} = useRoom({
    onJoin: () => { setOnJoinCalled(true); },
    onLeave: () => { setOnLeaveCalled(true); }
  });

  useEffect(() => {
    if (onJoinCalled) {
      (async () => {
        // if (session_id ) {
        // storeRoomJoinData(roomRole, session_id);
        // startTimer();
        //TODO:  websocket connection to get joinedAt, signature, duration,
         const {joinedAt, signature, duration, roomRole} = await ky.get('')
        if (roomRole === 'teacher' && threeMinElapsed && joinedAt && duration && signature){
          //NOTE: threeMinElapsed relates to second user joining room
          //TODO: Try to do threeMinElapsed again on client-side

          //learner fault: didn't join
        } else if (roomRole === 'learner' && threeMinElapsed && joinedAt && duration && signature) {
          // teacher fault: didn't join
        }
        // }
      })();
    }
  }, [onJoinCalled])



  useEffect(() => {
    if (onLeaveCalled && !onLeaveGracefully) {
      // rejoin time set for 90 seconds
    }
    //intentional leaveRoom
    if ( onLeaveCalled && onLeaveGracefully ) {
//TODO: re-use onJoinCalled effects websocket to get the sigs
//TODO implement timers client side if possible to reduce DO dependencies
      leaveRoom();
      <Redirect to={`room/${roomId}/summary`} />
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
