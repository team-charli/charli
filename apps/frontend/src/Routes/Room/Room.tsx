import ky from 'ky';
import { useRoom } from '@huddle01/react/hooks';
import { useEffect, useState } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import useBellListener from '../../hooks/Room/useBellListener';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { RoomProps, TimestampResponse } from '../../types/types';
import { checkHashedAddress } from '../../utils/app';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import {useStoreRoomJoinData}  from '../../hooks/Supabase/DbCalls/useStoreRoomJoinData'

import { useCallExecuteTransferControllerToTeacher } from '../../hooks/Room/useCallExecuteTransferControllerToTeacher';
import { useStoreRoomLeftData } from '../../hooks/Supabase/DbCalls/useStoreRoomLeftData';

const Room  = ( {match, location}: RoomProps) => {
  const roomId = match.params.id
  const {roomRole} = location.state;
  const [ huddleAccessToken ] = useLocalStorage<string>('huddle-access-token');
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs');
  const [signedJoinSignature, setSignedJoinSignature] = useState<string | null>(null);

  useCallExecuteTransferControllerToTeacher(roomRole)

  const { storeRoomJoinData } = useStoreRoomJoinData();
  const { storeRoomLeftData } = useStoreRoomLeftData()
  const [onJoinCalled, setOnJoinCalled ] = useState(false);
  const [ onJoinRun, setOnJoinRun ] = useState(false);
  const [ onLeaveCalled, setOnLeaveCalled ] = useState(false);
  const [ onLeaveRun, setOnLeaveRun ] = useState(false);
  useEffect(() => {
    if (onJoinCalled && !onJoinRun){
      (async () => {
        if (sessionSigs && currentAccount && location.state.notification.session_id){
          const session_id = location.state.notification.session_id;
          const pkpWallet = new PKPEthersWallet({controllerSessionSigs: sessionSigs, pkpPubKey: currentAccount.publicKey})
          await pkpWallet.init()
          const timestampRes = await ky.get('https://sign-timestamp.zach-greco.workers.dev').json<TimestampResponse>();
          const {timestamp: joinedTimestamp, signature: joinedTimestampWorkerSig} = timestampRes
          const sigRes = await pkpWallet.signMessage(joinedTimestamp + roomRole);
          setSignedJoinSignature(sigRes);
          storeRoomJoinData(joinedTimestamp, signedJoinSignature, roomRole,
          joinedTimestampWorkerSig, session_id);
        }
      })();
      console.log('Joined the room');
      setOnJoinRun(true);
    }
  }, [onJoinCalled, onJoinRun])

  useEffect(() => {
    if (onLeaveCalled && !onLeaveRun ) {
      //rejoin time expires
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
      setOnLeaveRun(true);
    }
  }, [onLeaveCalled, onLeaveRun])

  const { joinRoom, leaveRoom, state: roomJoinState} = useRoom({
    onJoin: () => { setOnJoinCalled(true); },
    onLeave: () => { setOnLeaveCalled(true); }
  });

  useEffect(() => {
    let hashed_learner_address;
    let hashed_teacher_address;
    if (roomId &&
      huddleAccessToken &&
      roomJoinState === 'idle' &&
      currentAccount &&
      checkHashedAddress(currentAccount, roomRole, hashed_learner_address, hashed_teacher_address )
    ) {
      joinRoom({roomId, token: huddleAccessToken})
    }
  }, [ huddleAccessToken, roomJoinState ]);

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
