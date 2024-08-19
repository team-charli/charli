import { useEffect, useState } from 'react';
import { useRoom } from '@huddle01/react/hooks';
import useLocalStorage from '@rehooks/local-storage';
import LocalPeer from './Components/LocalPeer';
import RemotePeer from './Components/RemotePeer';
import { redirect, useParams, useSearch } from '@tanstack/react-router';
import { router } from '@/TanstackRouter/router';
import { useSessionDurationIPFS } from './hooks/IPFS/useSessionDurationIPFS';
import { useExecuteTransferControllerToTeacher } from './hooks/LitActionHooks/useExecuteTransferControllerToTeacher';
import useBellListener from './hooks/Room/useBellListener';
import useSessionCases from './hooks/Room/useSessionCases';
import useSessionManager from './hooks/Room/useSessionManager';
import { useVerifiyRoleAndAddress } from './hooks/Room/useVerifiyRoleAndAddress';
import { useLitAccount, useSessionSigs } from '@/contexts/AuthContext';

interface RoomQueryParams {
  id: string;
  roomRole: 'teacher' | 'learner';
  notification: string;
}
const Room  = () => {
  const { id: roomId } = useParams({ from: '/room/$id' });
  const { roomRole, sessionId } = useSearch({ from: '/room/$id' })


  // const [onJoinCalled, setOnJoinCalled ] = useState(false);
  const [ onLeaveCalled, setOnLeaveCalled ] = useState(false);
  const { data: currentAccount } = useLitAccount();
  const { data: sessionSigs } = useSessionSigs();

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
         throw redirect `/room[roodId]-summary`;
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

