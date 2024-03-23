import { RouteComponentProps } from 'react-router-dom';
import { useRoom } from '@huddle01/react/hooks';
import { useEffect } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import RemotePeer from './Components/RemotePeer';
import LocalPeer from './Components/LocalPeer';
import useBellListener from '../../hooks/Room/useBellListener';
import { IRelayPKP } from '@lit-protocol/types';
import { useExecuteTransferControllerToTeacher } from '../../hooks/LitActions/useExecuteTransferControllerToTeacher';
interface MatchParams {
  id: string;
}

const Room: React.FC<RouteComponentProps<MatchParams>> = ( {match, roomRole} ) => {
  const roomId = match.params.id
  const [ huddleAccessToken ] = useLocalStorage<string>('huddle-access-token')
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const { executeTransferControllerToTeacher } = useExecuteTransferControllerToTeacher();
  const { joinRoom, leaveRoom, state: roomJoinState} = useRoom({
    onJoin: () => {
      // has access to if the user is a teacher or learner --> roomRole
      // has access to user's ethereum address  --> currentAccount.ethAddress
      // hasPrepaid(currentAccount)  check in Lit Action
      // need to do some polling here maybe
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
    if (roomId && huddleAccessToken && roomJoinState === 'idle') {
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
