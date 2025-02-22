// LocalPeerView.tsx
// LocalPeerView.tsx
import { useEffect, useRef } from 'react';
import { useLocalVideo, useLocalAudio } from '@huddle01/react/hooks';

interface LocalPeerViewProps {
  isRoomConnected: boolean;
}

export default function LocalPeerView({ isRoomConnected }: LocalPeerViewProps) {
  // We just consume the local streams:
  const { stream: localVideoStream } = useLocalVideo();
  const { stream: localAudioStream } = useLocalAudio();

  // Video element ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach the local video stream to the <video> element
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
        &nbsp;(
        {isRoomConnected ? 'Room joined' : 'Not joined yet'}
        )
      </span>
    </div>
  );
}
