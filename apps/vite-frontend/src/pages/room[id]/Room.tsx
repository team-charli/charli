// Room.tsx
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

import {
  useLocalPeer,
  useLocalVideo,
  // Important: we'll configure useLocalAudio with callbacks
  useLocalAudio,
} from '@huddle01/react/hooks';

import { useVerifiyRoleAndAddress } from './hooks/useVerifiyRoleAndAddress';
//import { useSessionTimeTracker } from './hooks/useSessionTimeTracker';
import { useRoomJoin } from './hooks/useRoomJoin';
import { useRoomLeave } from './hooks/useRoomLeave';
import useBellListener from './hooks/useBellListener';

import LocalPeerView from './Components/LocalPeerView';
//import RemotePeerView from './Components/RemotePeerView';
import ControlRibbon from './Components/ControlRibbon';

import { useParams, useSearch } from '@tanstack/react-router';
import { useAudioStreaming } from './AssessmentHooks/useAudioStreaming';

export default function Room() {
  const navigate = useNavigate();
  const { id: roomId } = useParams({ from: '/room/$id' });
  const { roomRole, hashedLearnerAddress, hashedTeacherAddress, controllerAddress } =
  useSearch({ from: '/room/$id' });

  // 1) Verify user role & address
  const { data: verifiedRoleAndAddressData } =
  useVerifiyRoleAndAddress(hashedTeacherAddress, hashedLearnerAddress, roomRole);

  // 2) Session time-tracker DO
  //const { hasConnectedWs, initializationComplete, isFinalized } =
  //useSessionTimeTracker(roomId, hashedLearnerAddress, hashedTeacherAddress, controllerAddress);

  // 3) Join Huddle01
  const { roomJoinState, peerIds } = useRoomJoin(roomId, {
    verifiedRoleAndAddressData,
    //hasConnectedWs,
    //initializationComplete,
  });

  // 4) On finalize => leave the room
  const { leaveRoom } = useRoomLeave(roomId);
  useBellListener();

  // 5) Local peer info
  const { peerId: localPeerId } = useLocalPeer();
  const isRoomConnected = roomJoinState === 'connected';

  // 6) Local video
  const { stream: localVideoStream } = useLocalVideo();

  // 7) Local audio with callbacks
  //    onProduceStart => user mic is actually “on”
  //    onProduceClose => user mic turned off
  const {
    stream: localAudioStream,
    isProducing, // “true” if the audio track is being produced
  } = useLocalAudio({
    onProduceStart: () => {
      if (!isRecording) {
        //TODO: trigger on bothJoined once tested
        startRecording();
      }
    },
    onProduceClose: () => {
      // This event fires if user manually toggles mic off
      if (isRecording /*&& !isFinalized*/) {
        // only do a partial stop if session not ended
        pauseRecording();
      }
    },
  });

  // 8) Set up near real-time audio streaming
  const {
    isRecording,
    startRecording,
    stopRecording,
    pauseRecording,
  } = useAudioStreaming(localAudioStream, {
    uploadUrl: `/audio/${roomId}`,
    timeslice: 2000,
  });

  // 9) When session is truly over
  useEffect(() => {
    if (/*isFinalized &&*/ isRecording) {
      // Stop with final transcription
      stopRecording()
        .catch((err) => console.error('[Room] stopRecording failed:', err))
        .finally(() => {
          leaveRoom();
          navigate({ to: `/session-history` });
        });
    }
    /*else if (isFinalized) {
      // If we’re not currently recording for some reason, just finalize anyway
      leaveRoom();
      navigate({ to: `/session-history` });
    }*/
  }, [/*isFinalized,*/ isRecording, stopRecording, leaveRoom, navigate]);

  // 10) Filter out local peer
  const remotePeerIds = peerIds.filter((id) => id !== localPeerId);

  return (
    <div className="relative w-full h-screen bg-gray-900">
      <div className="flex w-full h-[85%]">
        <div className="flex-1 min-w-0 border-r border-gray-700">
          <LocalPeerView
            isRoomConnected={isRoomConnected}
            localVideoStream={localVideoStream}
            // pass these just for display if needed
            isRecording={isRecording}
            startRecording={startRecording}
            stopRecording={stopRecording}
          />
        </div>
        <div className="flex-1 min-w-0 border-l border-gray-700 p-4 flex flex-col gap-4">
          {/*remotePeerIds.length === 0 ? (
            <div className="text-center text-white">
              Waiting for remote peer...
            </div>
          ) : (
              remotePeerIds.map((id) => (
                <RemotePeerView key={id} peerId={id} />
              ))
            )*/}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <ControlRibbon />
      </div>
    </div>
  );
}
