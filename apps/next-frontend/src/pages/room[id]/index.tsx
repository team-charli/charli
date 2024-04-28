import { useRouter } from 'next/router';
import ky from 'ky';
import { useEffect, useState } from 'react';
import { useRoom } from '@huddle01/react/hooks';
import useLocalStorage from '@rehooks/local-storage';
import useBellListener from '../../hooks/Room/useBellListener';
import useSessionManager from '../../hooks/Room/useSessionManager';
import useSessionCases from '../../hooks/Room/useSessionCases';
import { AuthSig, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { useVerifiyRoleAndAddress } from '../../hooks/Room/useVerifiyRoleAndAddress';
import { useExecuteTransferControllerToTeacher } from '../../hooks/LitActions/useExecuteTransferControllerToTeacher';
import { useSessionDurationIPFS } from '../../hooks/IPFS/useSessionDurationIPFS';
import ClientSideRedirect from '@/components/ClientSideRedirect';
import { NotificationIface } from '@/types/types';
import LocalPeer from './Components/LocalPeer';
import RemotePeer from './Components/RemotePeer';

interface RoomQueryParams {
  id: string;
  roomRole: 'teacher' | 'learner';
  notification: string;
}
const Room  = () => {
  const router = useRouter();
  const { id: roomId, roomRole, notification } = router.query as unknown as RoomQueryParams;

  const parsedNotification: NotificationIface = JSON.parse(notification as string) as NotificationIface ;
  const { session_id: sessionId, hashed_learner_address, hashed_teacher_address } = parsedNotification;

  const [onJoinCalled, setOnJoinCalled ] = useState(false);
  const [ onLeaveCalled, setOnLeaveCalled ] = useState(false);
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount')
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs')
  const [authSig, setAuthSig] = useLocalStorage<AuthSig>("lit-wallet-sig");

  const [ huddleAccessToken ] = useLocalStorage<string>('huddle-access-token');
  const { getIPFSDuration } = useSessionDurationIPFS();

  const {verifiedRole, verifiedRoleAndAddress} = useVerifiyRoleAndAddress(hashed_teacher_address, hashed_learner_address, roomRole, currentAccount  )

  const sessionManager = useSessionManager({clientSideRoomId: roomId, hashedLearnerAddress: hashed_learner_address, hashedTeacherAddress: hashed_teacher_address, userAddress: currentAccount?.ethAddress, sessionSigs, currentAccount});

  const sessionDurationResponse= getIPFSDuration(String(sessionId));
  let teacherDurationSig, learnerDurationSig, sessionDuration
  if (sessionDurationResponse) {
    teacherDurationSig = sessionDurationResponse.data.learnerSignature;
    learnerDurationSig = sessionDurationResponse.data.teacherSignature;
    sessionDuration = sessionDurationResponse.data.sessionDuration;
  }

  const userIPFSData = useSessionCases(sessionManager);
  if (!userIPFSData) throw new Error('userIPFSData not defined')
  const actionResult = useExecuteTransferControllerToTeacher(userIPFSData, sessionSigs, authSig, sessionDuration, teacherDurationSig, learnerDurationSig, currentAccount?.ethAddress );

  // TODO: generalize relayer
  // TODO: send actionResult with relayer


  useEffect(() => {
    if (roomId &&
      huddleAccessToken &&
      roomJoinState === 'idle' &&
      verifiedRoleAndAddress
    ) {
      joinRoom({roomId, token: huddleAccessToken})
    }
  }, [ huddleAccessToken ]);

  const { joinRoom, leaveRoom, state: roomJoinState} = useRoom({
    onJoin: () => { setOnJoinCalled(true); },
    onLeave: () => { setOnLeaveCalled(true); }
  });

  useEffect(() => {
    if ( onLeaveCalled ) router.push(`/room[roodId]-summary`);
  }, [onLeaveCalled])


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

