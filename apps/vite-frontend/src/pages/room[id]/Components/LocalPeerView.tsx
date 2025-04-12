//LocalPeerView.tsx
import { useEffect, useRef } from 'react';

interface LocalPeerViewProps {
  isRoomConnected: boolean;
  localVideoStream: MediaStream | null;
  isRecording: boolean;
}

export default function LocalPeerView({
  isRoomConnected,
  localVideoStream,
}: LocalPeerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
        &nbsp;({isRoomConnected ? 'Room joined' : 'Not joined yet'})
      </span>
    </div>
  );
}
