// LocalPeerView.tsx
import { useEffect, useRef } from 'react';
import { useLocalVideo, useLocalAudio } from '@huddle01/react/hooks';

export default function LocalPeerView() {
  const { stream: localVideoStream } = useLocalVideo();
  const { stream: localAudioStream } = useLocalAudio();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localVideoStream && videoRef.current) {
      videoRef.current.srcObject = localVideoStream;
      videoRef.current.onloadedmetadata = async () => {
        try {
          await videoRef.current?.play();
        } catch (err) {
          console.error('[LocalPeerView] autoplay error =>', err);
        }
      };
    }
  }, [localVideoStream]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <video ref={videoRef} autoPlay muted className="border border-gray-600" />
    </div>
  );
}
