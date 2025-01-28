// LocalPeerView.tsx
import { useEffect, useRef } from 'react';
import { useLocalVideo, useLocalAudio } from '@huddle01/react/hooks';

interface LocalPeerViewProps {
  isRoomConnected: boolean;
}

export default function LocalPeerView({ isRoomConnected }: LocalPeerViewProps) {
  // 1) Hooks for local camera & mic
  const {
    stream: localVideoStream,
    enableVideo,
    disableVideo,
  } = useLocalVideo();

  const {
    stream: localAudioStream,
    enableAudio,
    disableAudio,
  } = useLocalAudio();

  // 2) Video element ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // 3) Auto-start camera & mic once the room is connected
  useEffect(() => {
    if (isRoomConnected) {
      enableVideo().catch(err =>
        console.error('[LocalPeerView] enableVideo failed:', err),
      );
      enableAudio().catch(err =>
        console.error('[LocalPeerView] enableAudio failed:', err),
      );
    } else {
      disableVideo();
      disableAudio();
    }

    return () => {
      disableVideo();
      disableAudio();
    };
  }, [
    isRoomConnected,
    enableVideo,
    enableAudio,
    disableVideo,
    disableAudio,
  ]);

  // 4) Attach the local video stream to the <video> element
  useEffect(() => {
    if (videoRef.current && localVideoStream) {
      videoRef.current.srcObject = localVideoStream;
    }
  }, [localVideoStream]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        muted
        className="rounded-lg h-3/4 border border-gray-600"
      />
      <span className="text-white mt-2">
        Local Video {localVideoStream ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
