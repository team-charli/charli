// RemotePeerView.tsx
import React, { useEffect, useRef } from 'react';
import { useRemoteVideo, useRemoteAudio } from '@huddle01/react/hooks';

type RemotePeerViewProps = {
  peerId: string;
};

export default function RemotePeerView({ peerId }: RemotePeerViewProps) {
  const { stream: remoteVideoStream, state: videoState } = useRemoteVideo({
    peerId,
  });
  const { stream: remoteAudioStream, state: audioState } = useRemoteAudio({
    peerId,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    console.log(
      `[RemotePeerView] peerId=${peerId} => videoState=${videoState}, audioState=${audioState}`
    );
  }, [peerId, videoState, audioState]);

  useEffect(() => {
    if (remoteVideoStream && videoRef.current && videoState === 'playable') {
      try {
        videoRef.current.srcObject = remoteVideoStream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
          } catch (err) {
            console.error('[RemotePeerView] video autoplay error =>', err);
          }
        };
      } catch (err) {
        console.error('[RemotePeerView] assigning video stream error =>', err);
      }
    }
  }, [remoteVideoStream, videoState]);

  useEffect(() => {
    if (remoteAudioStream && audioRef.current && audioState === 'playable') {
      try {
        audioRef.current.srcObject = remoteAudioStream;
        audioRef.current.onloadedmetadata = async () => {
          try {
            await audioRef.current?.play();
          } catch (err) {
            console.error('[RemotePeerView] audio autoplay error =>', err);
          }
        };
      } catch (err) {
        console.error('[RemotePeerView] assigning audio stream error =>', err);
      }
    }
  }, [remoteAudioStream, audioState]);

  return (
    <div className="border border-gray-600 p-2 flex flex-col items-center gap-2">
      <p className="text-white text-sm">Remote Peer: {peerId}</p>

      {videoState === 'playable' ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-auto h-40 border border-gray-500"
        />
      ) : (
        <div className="text-gray-400 text-sm">No remote video yet</div>
      )}

      <audio ref={audioRef} autoPlay />

      <p className="text-xs text-gray-500">
        videoState: {videoState}, audioState: {audioState}
      </p>
    </div>
  );
}
