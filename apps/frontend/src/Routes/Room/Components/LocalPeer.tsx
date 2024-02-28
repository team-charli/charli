import { Video, Audio } from "@huddle01/react/dist/components";
import { useLocalAudio, useLocalVideo } from "@huddle01/react/hooks";
import useLocalStorage from "@rehooks/local-storage";
import { useEffect } from "react";
interface LocalPeerProps {
  roomJoinState: 'idle' | 'connecting' | 'connected' | 'failed' | 'left' | 'closed';
}

const LocalPeer = ({roomJoinState}: LocalPeerProps) => {
  const { stream: localVideoStream, enableVideo, disableVideo, isVideoOn } = useLocalVideo();
  const { stream: localAudioStream, enableAudio, disableAudio, isAudioOn } = useLocalAudio();

  useEffect(() => {
    if (roomJoinState === 'connected') {
      enableAudio();
      enableVideo();
    }
  }, [roomJoinState])

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
