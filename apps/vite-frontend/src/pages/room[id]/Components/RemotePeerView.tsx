// RemotePeerView.tsx
import { useEffect, useRef } from 'react';
import { useRemoteVideo, useRemoteAudio } from '@huddle01/react/hooks';

interface RemotePeerViewProps {
  peerId: string;
}

export default function RemotePeerView({ peerId }: RemotePeerViewProps) {
  // Access the remote peer’s audio/video streams
  const { stream: remoteVideoStream } = useRemoteVideo({ peerId });
  const { stream: remoteAudioStream } = useRemoteAudio({ peerId });

  // Refs for attaching the streams
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Attach video
  useEffect(() => {
    if (videoRef.current && remoteVideoStream) {
      videoRef.current.srcObject = remoteVideoStream;
    }
  }, [remoteVideoStream]);

  // Attach audio
  useEffect(() => {
    if (audioRef.current && remoteAudioStream) {
      audioRef.current.srcObject = remoteAudioStream;
    }
  }, [remoteAudioStream]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-2">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover border border-gray-600 rounded"
      />
      <audio ref={audioRef} autoPlay />

      <div className="text-white">Remote Peer: {peerId}</div>
    </div>
  );
}
