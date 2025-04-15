// ~/Projects/charli/apps/vite-frontend/src/pages/room[id]/Room.tsx

import { useEffect, useMemo } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { useLocalPeer } from "@huddle01/react/hooks";
import { useVerifiyRoleAndAddress } from "./hooks/useVerifiyRoleAndAddress";
import { useRoomJoin } from "./hooks/useRoomJoin";
import { useRoomLeave } from "./hooks/useRoomLeave";
import LocalPeerView from "./Components/LocalPeerView";
import RemotePeerView from "./Components/RemotePeerView";
import ControlRibbon from "./Components/ControlRibbon";
import { useAudioPipeline } from "./hooks/useAudioPipeline";
import { useComprehensiveHuddleMonitor } from "./hooks/usePeerConnectionMonitor";
import useBellListener from "./hooks/useBellListener";

export default function Room() {
  /**
   * 1) Get room & role info from URL
   */
  const { id: roomId } = useParams({ from: "/room/$id" });
  const { roomRole, hashedLearnerAddress, hashedTeacherAddress } = useSearch({
    from: "/room/$id",
  });

  /**
   * 2) Verify role/address if needed
   */
  const { data: verifiedRoleAndAddressData } = useVerifiyRoleAndAddress(
    hashedTeacherAddress,
    hashedLearnerAddress,
    roomRole
  );

  /**
   * 3) Immediately join the room but with mic/camera OFF
   */
  const {
    roomJoinState,
    isAudioOn,
    enableAudio,
    disableAudio,
    localAudioStream,
    isVideoOn,
    enableVideo,
    disableVideo,
    peerIds,
    localVideoStream
  } = useRoomJoin(roomId, {
    verifiedRoleAndAddressData,
  });

  /**
   * 4) Once joined, get localPeerId from Huddle to build uploadUrl
   */
  const { peerId: localPeerId } = useLocalPeer();

  const uploadUrl = useMemo(() => {
    if (!localPeerId) return null;
    return `https://learner-assessment-worker.charli.chat/audio/${roomId}?peerId=${localPeerId}&role=${roomRole}`;
  }, [roomId, localPeerId, roomRole]);

  /**
   * 5) Pipeline: Waits for (uploadUrl && localAudioStream && isAudioOn).
   */
  const { isRecording, cleanupAudio } = useAudioPipeline({
    localAudioStream,
    isAudioOn,
    uploadUrl,
  });

  /**
   * 6) Enable mic once uploadUrl is valid (so pipeline captures from first sample)
   */
  useEffect(() => {
    if (!uploadUrl) return;
    if (!isAudioOn) {
      console.log("[Room] => We have a valid uploadUrl, enabling mic now...");
      enableAudio().catch((err) => console.error("enableAudio() failed:", err));
    }
  }, [uploadUrl, isAudioOn, enableAudio]);

  /**
   * 7) Optionally auto-enable video once "connected"
   */
  useEffect(() => {
    if (roomJoinState === "connected" && !isVideoOn) {
      console.log("[Room] => enabling video now that we are connected...");
      enableVideo().catch((err) => console.error("enableVideo() failed:", err));
    }
  }, [roomJoinState, isVideoOn, enableVideo]);

  /**
   * 8) We'll consider ourselves "connected" if Huddle state is "connected"
   */
  const isRoomConnected = roomJoinState === "connected";

  /**
   * 9) Misc. custom events + monitor
   */
  useBellListener();
  useComprehensiveHuddleMonitor(localAudioStream);

  /**
   * 10) Transcript WebSocket
   */
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

  /**
   * 11) Leave the room
   */
  const { leaveRoom } = useRoomLeave(roomId);

  async function handleEndSession() {
    console.log("[Room] => handleEndSession => called");
    try {
      // flush pipeline if recording
      if (isRecording) await cleanupAudio();
      // turn off audio
      if (isAudioOn) await disableAudio();
      // turn off video if on
      if (isVideoOn) await disableVideo();

      leaveRoom();
      console.log("[Room] => left Huddle01 room successfully");

      // optionally finalize with the server
      if (uploadUrl) {
        const response = await fetch(`${uploadUrl}?action=end-session`, { method: "POST" });
        if (!response.ok) throw new Error("Server finalization failed");
        console.log("[Room] => server finalization triggered");
      }
    } catch (err) {
      console.error("[Room] => end session error:", err);
    }
  }

  /**
   * 12) Filter out our own peer from the peer list for remote UI
   */
  const remotePeerIds = peerIds.filter((id) => id !== localPeerId);

  /**
   * 13) Render local + remote UIs
   */
  return (
    <div className="relative w-full h-screen bg-gray-900">
      <div className="flex w-full h-[85%]">
        {/* Left side: local user */}
        <div className="flex-1 min-w-0 border-r border-gray-700">
          <button
            onClick={handleEndSession}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            End Session & Get Transcript
          </button>
          {/* Local preview */}
          <LocalPeerView
            isRoomConnected={isRoomConnected}
            localVideoStream={localVideoStream}
            isRecording={isRecording}
          />
        </div>

        {/* Right side: remote peers */}
        <div className="flex-1 min-w-0 border-l border-gray-700 p-4 flex flex-col gap-4">
          {remotePeerIds.length === 0 ? (
            <div className="text-center text-white">No remote peers yet</div>
          ) : (
            remotePeerIds.map((peerId) => (
              <RemotePeerView key={peerId} peerId={peerId} />
            ))
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <ControlRibbon />
      </div>
    </div>
  );
}
