// components/RemotePeerView.tsx
import { useEffect, useRef } from 'react';
import { usePeerIds, useRemoteVideo, useRemoteAudio } from '@huddle01/react/hooks';

export default function RemotePeerView() {
  // 1. Get the array of remote peer IDs from Huddle
  const { peerIds } = usePeerIds();

  // 2. For a single-remote-user scenario, pick the first ID or null if none
  const singlePeerId = peerIds.length > 0 ? peerIds[0] : null;

  if (!singlePeerId) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        Waiting for remote peer...
      </div>
    );
  }

  // 3. Access the remote peer’s audio/video streams
  const { stream: remoteVideoStream } = useRemoteVideo({ peerId: singlePeerId });
  const { stream: remoteAudioStream } = useRemoteAudio({ peerId: singlePeerId });

  // 4. Refs for attaching the streams
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

      <div className="text-white">Remote Peer: {singlePeerId}</div>
    </div>
  );
}
