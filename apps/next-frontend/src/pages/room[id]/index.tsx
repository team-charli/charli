import { useRouter } from 'next/router';
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

  const parsedNotification: NotificationIface = JSON.parse(notification);
  const { session_id: sessionId, hashed_learner_address, hashed_teacher_address } = parsedNotification;

  // const [onJoinCalled, setOnJoinCalled ] = useState(false);
  const [ onLeaveCalled, setOnLeaveCalled ] = useState(false);
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount')
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs')
  const [ authSig ] = useLocalStorage<AuthSig>("lit-wallet-sig");

  const [ huddleAccessToken ] = useLocalStorage<string>('huddle-access-token');
  const { getIPFSDuration } = useSessionDurationIPFS();

  const {verifiedRole, verifiedRoleAndAddress} = useVerifiyRoleAndAddress(hashed_teacher_address, hashed_learner_address, roomRole, currentAccount  )
  console.log(verifiedRole);

  const sessionManager = useSessionManager({clientSideRoomId: roomId, hashedLearnerAddress: hashed_learner_address, hashedTeacherAddress: hashed_teacher_address, userAddress: currentAccount?.ethAddress, sessionSigs, currentAccount});

  let teacherDurationSig, learnerDurationSig, sessionDuration;

  getIPFSDuration(String(sessionId))
    .then((sessionDurationResponse) => {
      if (sessionDurationResponse) {
        teacherDurationSig = sessionDurationResponse.data.teacherSignature;
        learnerDurationSig = sessionDurationResponse.data.learnerSignature;
        sessionDuration = sessionDurationResponse.data.sessionDuration;
      }
    })
    .catch((error) => {
      console.error('Error retrieving session duration:', error);
    });

  const userIPFSData = useSessionCases(sessionManager);
  if (!userIPFSData) throw new Error('userIPFSData not defined')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const actionResult = useExecuteTransferControllerToTeacher(userIPFSData, sessionSigs, authSig, sessionDuration, teacherDurationSig, learnerDurationSig, currentAccount?.ethAddress );
  const { joinRoom, state: roomJoinState} = useRoom({
    onLeave: () => { setOnLeaveCalled(true); }
  });


  // TODO: generalize relayer
  // TODO: send actionResult with relayer

  useEffect(() => {
    void (async () => {
      if (roomId &&
        huddleAccessToken &&
        roomJoinState === 'idle' &&
        verifiedRoleAndAddress
      ) {
        await joinRoom({roomId, token: huddleAccessToken})
      }
    })();
  },
    [joinRoom, roomId, roomJoinState, verifiedRoleAndAddress, huddleAccessToken]);


  useEffect(() => {
    void (async () => {
      if ( onLeaveCalled ) {
        console.log('push to room summary');
        await router.push(`/room[roodId]-summary`);
      }
    })();
  }, [onLeaveCalled, router])


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

