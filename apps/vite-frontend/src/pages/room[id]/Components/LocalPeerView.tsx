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
    <div className="h-full w-full flex flex-col items-center justify-center p-2 sm:p-3 md:p-4">
      <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="rounded-lg w-full h-full object-cover border border-gray-600 shadow-md bg-gray-900"
        />
        
        {!localVideoStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 rounded-lg">
            <div className="text-white text-center p-4">
              <div className="mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p>Camera Off</p>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          You
        </div>
        
        <div className="absolute top-2 right-2 flex gap-1">
          {localVideoStream && (
            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full mr-1"></span>
              Live
            </span>
          )}
          
          {isRoomConnected && (
            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              Connected
            </span>
          )}
        </div>
      </div>
      
      <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-center text-gray-300">
        {!isRoomConnected && (
          <span className="text-yellow-400">Connecting to room...</span>
        )}
      </div>
    </div>
  );
}
