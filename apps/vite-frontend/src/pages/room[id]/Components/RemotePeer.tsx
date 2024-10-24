//RemotePeer.tsx
import { useRemotePeer, useRemoteVideo, useRemoteAudio, usePeerIds, useLocalPeer } from '@huddle01/react/hooks';
import { useEffect, useRef } from 'react';

type RemotePeerProps = {
  remotePeerId: string;
};

const RemotePeer = ({ remotePeerId }: RemotePeerProps) => {

  // Get remote peer details and media
  const { metadata,  } = useRemotePeer({
    peerId: remotePeerId,
    onMetadataUpdate: (data) => {
      console.log('[Huddle] Remote peer metadata update:', JSON.stringify(data.metadata, null, 2));
    }
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    stream: videoStream,
    state: videoState,
    isVideoOn,
  } = useRemoteVideo({
    peerId: remotePeerId,
    onPlayable: (data) => {
      console.log('[Huddle] Remote video available:', remotePeerId);
      if (videoRef.current && data.stream) {
        videoRef.current.srcObject = data.stream;
      }
    }
  });

  const {
    stream: audioStream,
    state: audioState,
    isAudioOn,
  } = useRemoteAudio({
    peerId: remotePeerId,
    onPlayable: (data) => {
      console.log('[Huddle] Remote audio available:', remotePeerId);
      if (audioRef.current && data.stream) {
        audioRef.current.srcObject = data.stream;
      }
    }
  });

  // Debug logging
  useEffect(() => {
    console.log('[Huddle] Remote peer setup:', JSON.stringify({
      remotePeerId,
      hasVideo: !!videoStream,
      hasAudio: !!audioStream,
      videoState,
      audioState
    }, null, 2));
  }, [remotePeerId, videoStream, audioStream, videoState, audioState]);

  if (!remotePeerId) {
    return <div>Waiting for peer...</div>;
  }

  return (
    <div>
      {videoStream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: 'auto',
            display: isVideoOn ? 'block' : 'none',
            backgroundColor: '#000'
          }}
        />
      )}
      {audioStream && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
        />
      )}
    </div>
  );
};

export default RemotePeer;
