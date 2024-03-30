import ethers from 'ethers'
import { RouteComponentProps } from 'react-router-dom';
import { useRoom } from '@huddle01/react/hooks';
import { useEffect, useState } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import RemotePeer from './Components/RemotePeer';
import LocalPeer from './Components/LocalPeer';
import useBellListener from '../../hooks/Room/useBellListener';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { useExecuteTransferControllerToTeacher } from '../../hooks/LitActions/useExecuteTransferControllerToTeacher';
import { NotificationIface } from '../../types/types';
import { checkHashedAddress } from '../../utils/app';
import { useCheckHasPrePaid } from '../../hooks/Room/useCheckHasPrePaid';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useFetchControllerToTeacherActionData } from '../../hooks/Supabase/DbCalls/useFetchControllerToTeacherActionData';
import { useStoreJoinData } from '../../hooks/Supabase/DbCalls/useStoreJoinData';
import { useSessionContext } from '../../contexts/SessionsContext';

interface MatchParams {
  id: string;
}

interface RoomProps extends RouteComponentProps<MatchParams> {
  location: RouteComponentProps<MatchParams>['location'] & {
    state: {
      notification: NotificationIface;
      roomRole: string;
    };
  };
}
const Room  = ( {match, location}: RoomProps) => {
  const roomId = match.params.id
  const [ huddleAccessToken ] = useLocalStorage<string>('huddle-access-token');
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs');
  const { executeTransferControllerToTeacher } = useExecuteTransferControllerToTeacher();
  const [signedJoinSignature, setSignedJoinSignature] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const { sessionData } = useSessionContext();

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
    controller_address,
    session_id,
  }} = location.state;
  const {roomRole} = location.state;
  const hasPrepaid = useCheckHasPrePaid(controller_address, requested_session_duration)
  const { storeJoinData } = useStoreJoinData();
  const { fetchControllerToTeacherActionData } = useFetchControllerToTeacherActionData();
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
      // All required fields are available
      setIsSessionComplete(true);
    }
  }, [sessionData]);

  useEffect(() => {
    if (isSessionComplete) {
      // Perform signature verification, session data validation, and trigger Lit Action
      // ...
      executeTransferControllerToTeacher(/* Pass necessary data */);
    }
  }, [isSessionComplete]);

  const { joinRoom, leaveRoom, state: roomJoinState} = useRoom({
    onJoin: () => {
      (async () => {
        if (sessionSigs && currentAccount){
          const pkpWallet = new PKPEthersWallet({controllerSessionSigs: sessionSigs, pkpPubKey: currentAccount.publicKey})
          await pkpWallet.init()
          const joinedTimestamp = String(Date.now());
          const sigRes = await pkpWallet.signMessage(joinedTimestamp + roomRole);
          setSignedJoinSignature(sigRes);
          storeJoinData(joinedTimestamp, signedJoinSignature, roomRole, session_id)
        }
      })();
      //NOTE: reconcile lit action access controll condition abilities for:
      //timestamp
      // verify signatures
      // both signed session completed
      //_____
      // run stopwatch;
      // exceeds graceperiod; learner gets their money back
      // teacher must complete session time
      console.log('Joined the room');
    },
    onLeave: () => {
      //rejoin time expires
      (async () => {
        if (sessionSigs && currentAccount){
          const pkpWallet = new PKPEthersWallet({controllerSessionSigs: sessionSigs, pkpPubKey: currentAccount.publicKey})
          await pkpWallet.init()
          const leftTimestamp = String(Date.now());
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
