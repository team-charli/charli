// ~/Projects/charli/apps/vite-frontend/src/pages/room[id]/Room.tsx

import { useEffect, useMemo } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { useLocalVideo, useLocalAudio } from "@huddle01/react/hooks";
import { useVerifiyRoleAndAddress } from "./hooks/useVerifiyRoleAndAddress";
import { useRoomJoin } from "./hooks/useRoomJoin";
import { useRoomLeave } from "./hooks/useRoomLeave";
import { useLocalPeer } from '@huddle01/react/hooks';
import useBellListener from "./hooks/useBellListener";
import LocalPeerView from "./Components/LocalPeerView";
import ControlRibbon from "./Components/ControlRibbon";
import { useComprehensiveHuddleMonitor } from "./hooks/usePeerConnectionMonitor";

export default function Room() {
  const { id: roomId } = useParams({ from: "/room/$id" });
  const { roomRole, hashedLearnerAddress, hashedTeacherAddress } = useSearch({
    from: "/room/$id",
  });

  // Where we post PCM data

  /** 1. Verify role/address */
  const { data: verifiedRoleAndAddressData } = useVerifiyRoleAndAddress(
    hashedTeacherAddress,
    hashedLearnerAddress,
    roomRole
  );

  /** 2. Join the room (this also calls enableAudio before joinRoom, etc.) */
  const { peerId: localPeerId } = useLocalPeer(); // localPeerId can be null at first

  const uploadUrl = useMemo(() => {
    if (!localPeerId) return null;
    return `https://learner-assessment-worker.charli.chat/audio/${roomId}?peerId=${localPeerId}&role=${roomRole}`;
  }, [roomId, localPeerId, roomRole]);

  const { roomJoinState } = useRoomJoin(roomId, { verifiedRoleAndAddressData },  uploadUrl);

  /** 3. Use separate hook to leave the room */
  const { leaveRoom } = useRoomLeave(roomId);

  /** 4. Listen for "bell" events (custom) */
  useBellListener();
  /** 5. For local video UI (We won't start video here; that is handled automatically by `useRoomJoin` or in an effect in that hook. But we do need the stream for local UI.) */
  const { stream: localVideoStream, disableVideo } = useLocalVideo();

  /** 6. For local audio UI - isProducing indicates that Huddle is actually sending your audio track - We'll also call disableAudio() in our cleanup below. */
  const { stream: localAudioStream, disableAudio, isProducing } = useLocalAudio();

  /** 7. The new Audio Pipeline Hook - listens to localAudioStream & starts the AudioWorklet - sends PCM data to `uploadUrl` - returns isRecording + cleanupAudio */

  /** 8. We'll consider ourselves "connected" if Huddle state is "connected" */
  const isRoomConnected = roomJoinState === "connected";

  /** 9. Optionally monitor the Huddle Peer Connection */
  useComprehensiveHuddleMonitor(localAudioStream);

  /** 10. Transcript WebSocket  */
  useEffect(() => {
    const ws = new WebSocket(`wss://learner-assessment-worker.charli.chat/connect/${roomId}`);
    ws.onopen = () => console.log("[TranscriptListener] WebSocket connected.");
    ws.onmessage = (evt) => {
      const message = JSON.parse(evt.data);
      switch (message.type) {
        case "partialTranscript":
          console.log("[TranscriptListener] Partial transcript:", message.data);
          break;
        case "transcription-complete":
          console.log("[TranscriptListener] Transcription complete:", message.data);
          break;
        case "transcription-error":
          console.error("[TranscriptListener] Transcription error:", message.data.error);
          break;
        default:
          console.warn("[TranscriptListener] Unknown message type:", message.type);
      }
    };
    ws.onerror = (err) => console.error("[TranscriptListener] WebSocket error:", err);

    return () => ws.close();
  }, [roomId]);

  /** 11. End session logic: stop sending tracks, flush/cleanup audio pipeline, then leave the room, then finalize on server side. */
  const handleEndSession = async () => {
    console.log("[Room] End Session initiated", new Date().toISOString());
    try {

      await disableVideo();
      leaveRoom();
      console.log("[Room] Successfully left Huddle01 room", new Date().toISOString());

      const response = await fetch(`${uploadUrl}?action=end-session`, { method: "POST" });
      if (!response.ok) throw new Error("Server finalization failed");
      console.log("[Room] Server finalization triggered", new Date().toISOString());
    } catch (err) {
      console.error("[Room] End-session error:", err);
    }
  };

  /** 12. Render UI */
  return (
    <div className="relative w-full h-screen bg-gray-900">
      <div className="flex w-full h-[85%]">
        <div className="flex-1 min-w-0 border-r border-gray-700">
          <button
            onClick={handleEndSession}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            End Session & Get Transcript
          </button>
          <LocalPeerView
            isRoomConnected={isRoomConnected}
            localVideoStream={localVideoStream}
            // Optionally pass pipeline state to show an indicator:
          />
        </div>
        <div className="flex-1 min-w-0 border-l border-gray-700 p-4 flex flex-col gap-4">

        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <ControlRibbon />
      </div>
    </div>
  );
}
