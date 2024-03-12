import { RouteComponentProps } from 'react-router-dom';
import { useRoom } from '@huddle01/react/hooks';
import { useEffect } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import RemotePeer from './Components/RemotePeer';
import LocalPeer from './Components/LocalPeer';
import useBellListener from '../../hooks/Room/useBellListener';
import { IRelayPKP } from '@lit-protocol/types';
interface MatchParams {
  id: string;
}
const Room: React.FC<RouteComponentProps<MatchParams>> = ( {match, role} ) => {
  const roomId = match.params.id
  const [huddleAccessToken] = useLocalStorage<string>('huddle-access-token')
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const roomRole = isLearner(role) || isTeacher(role)

  const { joinRoom, leaveRoom, state: roomJoinState} = useRoom({
    onJoin: () => {
      //Trigger Lit Action
      // has access to if the user is a teacher or learner --> roomRole
      // has access to user's ethereum address  --> currentAccount.ethAddress
      hasPrepaid(currentAccount)
      console.log('Joined the room');
    },
    onLeave: () => {
      //Trigger Lit Action
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
