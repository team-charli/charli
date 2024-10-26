//RemotePeer.tsx
import { useRemotePeer, useRemoteVideo, useRemoteAudio } from '@huddle01/react/hooks';
import { useEffect, useRef } from 'react';

type RemotePeerProps = {
  remotePeerId: string;
};

const RemotePeer = ({ remotePeerId }: RemotePeerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get remote peer details
  const { metadata } = useRemotePeer({
    peerId: remotePeerId,
    onMetadataUpdate: (data) => {
      // console.log('[Huddle] Remote peer metadata update:', JSON.stringify(data.metadata, null, 2));
    }
  });

  // Video handling
  const {
    stream: videoStream,
    state: videoState,
    isVideoOn,
  } = useRemoteVideo({
    peerId: remotePeerId,
    onPlayable: (data) => {
      // console.log('[Huddle] Video stream playable:', {
      //   peerId: remotePeerId,
      //   state: videoState,
      //   hasStream: !!data.stream
      // });
    }
  });

  // Audio handling
  const {
    stream: audioStream,
    state: audioState,
    isAudioOn,
  } = useRemoteAudio({
    peerId: remotePeerId,
    onPlayable: (data) => {
      // console.log('[Huddle] Audio stream playable:', {
      //   peerId: remotePeerId,
      //   state: audioState,
      //   hasStream: !!data.stream
      // });
    }
  });

  // Handle video stream connection
  useEffect(() => {
    if (videoRef.current && videoStream) {
      console.log('[Huddle] Setting video stream to element');
      videoRef.current.srcObject = videoStream;

      // Ensure video plays
      videoRef.current.play().catch(e =>
        console.error('[Huddle] Video play error:', e)
      );
    }
  }, [videoStream]);

  // Handle audio stream connection
  useEffect(() => {
    if (audioRef.current && audioStream) {
      // console.log('[Huddle] Setting audio stream to element');
      audioRef.current.srcObject = audioStream;

      // Ensure audio plays
      audioRef.current.play().catch(e =>
        console.error('[Huddle] Audio play error:', e)
      );
    }
  }, [audioStream]);

return (
  <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className={`w-full h-full object-cover ${
        videoStream ? 'block' : 'hidden'
      }`}
    />
    {!videoStream && (
      <div className="absolute inset-0 flex items-center justify-center text-white">
        Waiting for video...
      </div>
    )}
    <audio
      ref={audioRef}
      autoPlay
      playsInline
    />
  </div>
);
};

export default RemotePeer;
