import {Audio}  from '@huddle01/react/components';
import {Video} from'@huddle01/react/components';
import { useLocalAudio, useLocalVideo } from "@huddle01/react/hooks";
import { useEffect } from "react";
interface LocalPeerProps {
  roomJoinState: 'idle' | 'connecting' | 'connected' | 'failed' | 'left' | 'closed';
}

const LocalPeer = ({roomJoinState}: LocalPeerProps) => {
  const { stream: localVideoStream, enableVideo, /*disableVideo, isVideoOn*/ } = useLocalVideo();
  const { stream: localAudioStream, enableAudio, /*disableAudio, isAudioOn */} = useLocalAudio();

  useEffect(() => {
    void (async () => {
      if (roomJoinState === 'connected') {
      await  enableAudio();
      await enableVideo();
      }
    })();
  }, [roomJoinState, enableAudio, enableVideo])

  const hasPeerData = localVideoStream && localAudioStream;

  return (
    <div>
      {hasPeerData ? (
        <>
          <Video stream={localVideoStream} />
          <Audio stream={localAudioStream} />
        </>
      ) : (
        <div>Stream Not Connected</div>
      )}
    </div>
  );
}

export default LocalPeer;
