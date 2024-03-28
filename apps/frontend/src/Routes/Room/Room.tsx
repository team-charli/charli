import ethers from 'ethers'
import { RouteComponentProps } from 'react-router-dom';
import { useRoom } from '@huddle01/react/hooks';
import { useEffect } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import RemotePeer from './Components/RemotePeer';
import LocalPeer from './Components/LocalPeer';
import useBellListener from '../../hooks/Room/useBellListener';
import { IRelayPKP } from '@lit-protocol/types';
import { useExecuteTransferControllerToTeacher } from '../../hooks/LitActions/useExecuteTransferControllerToTeacher';
import { NotificationIface } from '../../types/types';
import { checkHashedAddress } from '../../utils/app';

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
  const [ huddleAccessToken ] = useLocalStorage<string>('huddle-access-token')
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const { executeTransferControllerToTeacher } = useExecuteTransferControllerToTeacher();
  const {notification: {
    learner_id,
    learnerName,
    teacher_id,
    teacherName,
    request_origin_type,
    requested_session_duration,
    request_time_date,
    hashed_learner_address,
    hashed_teacher_address
  }} = location.state;
  const {roomRole} = location.state;
  const { joinRoom, leaveRoom, state: roomJoinState} = useRoom({
    onJoin: () => {
      // if teacher stamp that;
      // if session time starts with teacher
      // run stopwatch;
      // exceeds graceperiod; learner gets their money back
      // must complete their time
      // joined the room (means)
      //and  this sets up future checks
      console.log('Joined the room');
    },
    onLeave: () => {
      if (roomRole === 'learner') {
      (async () =>  {
        try {
          await executeTransferControllerToTeacher();
        } catch (error) {
          console.error(error)
        }
      })();
      }
      console.log('Left the room');
    },
  });

  useEffect(() => {
    // Join Room
    if (roomId &&
      huddleAccessToken &&
      roomJoinState === 'idle' &&
      currentAccount &&
      checkHashedAddress(currentAccount, roomRole, hashed_learner_address, hashed_teacher_address )  && hasPrepaid
      // hasPrepaid(currentAccount)
      // need to do some polling here maybe
      // look at gpt histories for more

       ) {
        joinRoom({roomId, token: huddleAccessToken})
    }
  }, [huddleAccessToken, roomJoinState]);

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
