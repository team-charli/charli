// LocalPeer.tsx
import { useMediaPermissions } from '@/Huddle/useMediaPermissions';
import { useLocalAudio, useLocalVideo } from '@huddle01/react/hooks';
import { useEffect, useRef, useCallback } from 'react';

interface LocalPeerProps {
  roomJoinState: 'idle' | 'connecting' | 'connected' | 'failed' | 'left' | 'closed';
}

const LocalPeer = ({ roomJoinState }: LocalPeerProps) => {
  const {
    stream: localVideoStream,
    enableVideo: enableVideoRaw,
    disableVideo: disableVideoRaw,
    isVideoOn,
  } = useLocalVideo();

  const {
    stream: localAudioStream,
    enableAudio: enableAudioRaw,
    disableAudio: disableAudioRaw,
    isAudioOn,
  } = useLocalAudio();

  const { requestPermissions, permissionsGranted } = useMediaPermissions();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stabilize the media control functions
  const enableVideo = useCallback(async () => {
    console.log('Enabling video...');
    await enableVideoRaw();
  }, [enableVideoRaw]);

  const enableAudio = useCallback(async () => {
    console.log('Enabling audio...');
    await enableAudioRaw();
  }, [enableAudioRaw]);

  const disableVideo = useCallback(async () => {
    console.log('Disabling video...');
    await disableVideoRaw();
  }, [disableVideoRaw]);

  const disableAudio = useCallback(async () => {
    console.log('Disabling audio...');
    await disableAudioRaw();
  }, [disableAudioRaw]);

  // Handle initialization
  useEffect(() => {
    let mounted = true;

    const initializeDevices = async () => {
      console.log('Initialize devices called. State:', JSON.stringify({
        roomJoinState,
        permissionsGranted,
        isVideoOn,
        isAudioOn
      }));

      if (roomJoinState === 'connected') {
        try {
          if (!permissionsGranted) {
            console.log('Requesting permissions...');
            const granted = await requestPermissions();
            console.log('Permissions granted:', granted);
            if (!mounted || !granted) return;
          }

          if (!isVideoOn) {
            await enableVideo();
          }
          if (!isAudioOn) {
            await enableAudio();
          }

          console.log('Devices initialized successfully');
        } catch (error) {
          console.error('Error initializing devices:', error);
        }
      }
    };

    initializeDevices();
    return () => {
      mounted = false;
    };
  }, [roomJoinState, permissionsGranted, isVideoOn, isAudioOn, enableVideo, enableAudio, requestPermissions]);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (isVideoOn) {
        disableVideo();
      }
      if (isAudioOn) {
        disableAudio();
      }
    };
  }, []); // Empty dependency array since this is only for unmount

  // Handle video stream
  useEffect(() => {
    if (localVideoStream && videoRef.current) {
      videoRef.current.srcObject = localVideoStream;
    }
  }, [localVideoStream]);

  // Handle audio stream
  useEffect(() => {
    if (localAudioStream && audioRef.current) {
      audioRef.current.srcObject = localAudioStream;
    }
  }, [localAudioStream]);

  return (
    <div>
      {localVideoStream && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: 'auto' }}
        />
      )}
      {localAudioStream && (
        <audio ref={audioRef} autoPlay playsInline />
      )}
    </div>
  );
};

export default LocalPeer;
