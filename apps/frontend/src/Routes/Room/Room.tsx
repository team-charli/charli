import { RouteComponentProps } from 'react-router-dom';
import { useRoom } from '@huddle01/react/hooks';
import { useEffect } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import RemotePeer from './Components/RemotePeer';
import LocalPeer from './Components/LocalPeer';
interface MatchParams {
  id: string;
}
const Room: React.FC<RouteComponentProps<MatchParams>> = ( {match} ) => {
  const roomId = match.params.id
  const [huddleAccessToken] = useLocalStorage<string>('huddle-access-token')

  const { joinRoom, leaveRoom, state: roomJoinState} = useRoom({
    onJoin: () => {
      //Trigger Lit Action
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

  return (
    <>
      <div className="__localVideo">
        <LocalPeer roomJoinState={roomJoinState} />
      </div>
      <div className="__remoteVideo">
        <RemotePeer />
      </div>
    </>

  )
}

export default Room
