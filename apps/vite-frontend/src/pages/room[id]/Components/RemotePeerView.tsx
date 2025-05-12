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
    <div className="flex flex-col items-center justify-center w-full h-full p-2 sm:p-3 md:p-4">
      <div className="relative w-full h-full rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover border border-gray-600 rounded-lg shadow-lg bg-gray-900"
        />
        <audio ref={audioRef} autoPlay />
        
        {!remoteVideoStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 rounded-lg">
            <div className="text-white text-center p-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-base sm:text-lg md:text-xl">Waiting for video...</p>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs sm:text-sm px-2 py-1 rounded">
          Partner
        </div>
        
        <div className="absolute top-2 right-2 flex gap-1">
          {remoteVideoStream && (
            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full mr-1"></span>
              Live
            </span>
          )}
          
          {remoteAudioStream && (
            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Audio
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
