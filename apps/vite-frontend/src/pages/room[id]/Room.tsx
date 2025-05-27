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
import { usePeerConnectionMonitor } from "./hooks/usePeerConnectionMonitor";

import useBellListener from "./hooks/useBellListener";
import { useCharliOverlay } from "./hooks/useCharliOverlay";

export default function Room() {
  /**
   * 1) Get room & role info from URL
   */
  const { id: urlRoomId } = useParams({ from: "/room/$id" });
  const { roomRole, hashedLearnerAddress, hashedTeacherAddress, roboTest, learnerId, sessionId } = useSearch({
    from: "/room/$id",
  });

  // Generate fresh roomId for robo mode to prevent DO reuse across deploys
  const roomId = useMemo(() => {
    if (roboTest === 'true') {
      return `${urlRoomId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return urlRoomId;
  }, [urlRoomId, roboTest]);

  /**
   * 2) Verify role/address if needed, or bypass verification for RoboTest
   */
  const { data: verificationData } = useVerifiyRoleAndAddress(
    hashedTeacherAddress,
    hashedLearnerAddress,
    roomRole
  );

  // Create a verified data object for RoboTest mode to bypass address verification
  const verifiedRoleAndAddressData = roboTest === 'true'
    ? { verifiedRole: roomRole, verifiedRoleAndAddress: true }
    : verificationData;

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

  // Use roboTest parameter or environment variable to enable RoboMode
  const isRoboMode = import.meta.env.VITE_ROBO_MODE === 'true' || roboTest === 'true';


  const uploadUrl = useMemo(() => {
    if (!localPeerId) return null;
    let url =  `https://learner-assessment-worker.charli.chat/audio/${roomId}?peerId=${localPeerId}&role=${roomRole}`;

    if (isRoboMode) {
      url += `&roboMode=true`;
      // Add the learnerId and sessionId if available from RoboTest mode
      if (learnerId) url += `&learnerId=${learnerId}`;
      if (sessionId) url += `&sessionId=${sessionId}`;
    }

    return url;
  }, [roomId, localPeerId, roomRole, isRoboMode, learnerId, sessionId]);

  // Log the uploadUrl for debugging
  useEffect(() => {
    console.log('[Room] uploadUrl:', uploadUrl);
  }, [uploadUrl]);

  /** 5) Pipeline: Waits for (uploadUrl && localAudioStream && isAudioOn). */
  const { isRecording, cleanupAudio } = useAudioPipeline({
    localAudioStream,
    isAudioOn,
    uploadUrl,
  });

  /** 6) Enable mic once uploadUrl is valid (so pipeline captures from first sample) */
  useEffect(() => {
    if (!uploadUrl) return;
    if (!isAudioOn) {
      console.log("[Room] => We have a valid uploadUrl, enabling mic now...");
      enableAudio().catch((err) => console.error("enableAudio() failed:", err));
    }
  }, [uploadUrl, isAudioOn, enableAudio]);

  /** 7) Optionally auto-enable video once "connected" */
  useEffect(() => {
    if (roomJoinState === "connected" && !isVideoOn) {
      console.log("[Room] => enabling video now that we are connected...");
      enableVideo().catch((err) => console.error("enableVideo() failed:", err));
    }
  }, [roomJoinState, isVideoOn, enableVideo]);

  /** 8) We'll consider ourselves "connected" if Huddle state is "connected" */
  const isRoomConnected = roomJoinState === "connected";

  /** 9) Misc. custom events + monitor */
  useBellListener();
  usePeerConnectionMonitor(localAudioStream);
  
  /** 9b) Charli overlay state */
  const { isVisible: isCharliVisible, answer: charliAnswer, showOverlay, showAnswer, hideOverlay } = useCharliOverlay();

  /** 10) Transcript WebSocket */
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let lastPlayedUtteranceId = 0;

    // Initialize AudioContext for audio playback
    if (isRoboMode) {
      audioContext = new AudioContext();
      console.log("[TranscriptListener] AudioContext created for robo mode");
    }

    const ws = new WebSocket(`wss://learner-assessment-worker.charli.chat/connect/${roomId}`);
    ws.onopen = () => console.log("[TranscriptListener] WebSocket connected.");
    ws.onmessage = async (evt) => {
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
        case "roboReplyText":
          console.log("[TranscriptListener] Robo reply text:", message.data.text, "utteranceId:", message.data.utteranceId);
          // Always render text subtitle and update last played ID
          if (message.data.utteranceId) {
            lastPlayedUtteranceId = message.data.utteranceId;
          }
          break;
        case "roboAudioMp3":
          console.log("[TranscriptListener] Received robo audio MP3, utteranceId:", message.data.utteranceId, "length:", message.data.mp3Base64?.length);
          // Only play audio if utteranceId >= lastPlayedUtteranceId
          if (audioContext && message.data.mp3Base64 && message.data.utteranceId >= lastPlayedUtteranceId) {
            try {
              // Convert base64 MP3 to binary
              const mp3Binary = Uint8Array.from(atob(message.data.mp3Base64), (c) => c.charCodeAt(0));
              console.log("[TranscriptListener] Decoded MP3 binary length:", mp3Binary.length);
              
              // Decode and play the MP3 audio
              const audioBuffer = await audioContext.decodeAudioData(mp3Binary.buffer);
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContext.destination);
              source.start();
              console.log(`[TranscriptListener] Robo audio playback started for utteranceId: ${message.data.utteranceId}`);
            } catch (err) {
              console.error("[TranscriptListener] Error playing robo audio:", err);
            }
          } else if (message.data.utteranceId < lastPlayedUtteranceId) {
            console.log(`[TranscriptListener] Skipping old audio utteranceId: ${message.data.utteranceId}, lastPlayed: ${lastPlayedUtteranceId}`);
          }
          break;
        case "charliStart":
          console.log("[TranscriptListener] Charli overlay started");
          showOverlay();
          break;
        case "charliAnswer":
          console.log("[TranscriptListener] Charli answer:", message.data.text);
          showAnswer(message.data.text);
          break;
        case "teacherNotice":
          console.log("[TranscriptListener] Teacher notice:", message.data.message);
          // You could add a toast notification here if needed
          break;
        default:
          console.warn("[TranscriptListener] Unknown message type:", message.type);
      }
    };
    ws.onerror = (err) => console.error("[TranscriptListener] WebSocket error:", err);
    
    return () => {
      ws.close();
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [roomId, isRoboMode, showOverlay, showAnswer]);

  /** 11) Leave the room */
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
        const endUrl = `${uploadUrl}&action=end-session`;
        const response = await fetch(endUrl, { method: "POST" });
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
    <div className="relative w-full h-screen bg-gray-900 flex flex-col">
      {/* Charli overlay */}
      {isCharliVisible && (
        <div className="fixed inset-0 bg-black flex items-center justify-center text-white z-50 animate-charli-down">
          <div className="text-center">
            <p className="text-3xl sm:text-5xl mb-10">
              {charliAnswer ?? "Escuchando…"}
            </p>
            <button 
              onClick={hideOverlay}
              className="absolute top-4 right-4 text-2xl hover:text-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Control ribbon at the top */}
      <div className="w-full">
        <ControlRibbon />
      </div>

      {/* Main content area */}
      <div className="flex-grow overflow-hidden flex flex-col sm:flex-row w-full">
        {/* Left side: local user (on mobile, this appears below the remote peer) */}
        <div className="w-full sm:w-1/3 lg:w-1/4 sm:min-h-0 sm:border-r border-gray-700 order-2 sm:order-1 flex flex-col">
          <div className="flex-grow">
            <LocalPeerView
              isRoomConnected={isRoomConnected}
              localVideoStream={localVideoStream}
              isRecording={isRecording}
            />
          </div>

          <div className="p-3 sm:p-4">
            <button
              onClick={handleEndSession}
              className="w-full px-3 sm:px-4 py-2 sm:py-3
                      bg-red-600 hover:bg-red-700 active:bg-red-800
                      text-white text-sm sm:text-base font-medium
                      rounded-lg shadow-sm
                      transition-colors duration-200
                      flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              End Session
            </button>
          </div>
        </div>

        {/* Right side: remote peers (on mobile, this appears above the local preview) */}
        <div className="w-full sm:w-2/3 lg:w-3/4 sm:min-h-0 order-1 sm:order-2 flex-grow overflow-auto p-2 sm:p-4">
          {remotePeerIds.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center bg-gray-800 bg-opacity-50 rounded-lg p-6 sm:p-8 max-w-md">
                <div className="text-5xl sm:text-6xl mb-4">👋</div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-white mb-2">Waiting for Partner</h3>
                <p className="text-sm sm:text-base text-gray-300">
                  Your session partner will join soon. Make sure your camera and microphone are working.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full">
              {remotePeerIds.map((peerId) => (
                <RemotePeerView key={peerId} peerId={peerId} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed controls at the bottom */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        {/* <div className="bg-gray-800 bg-opacity-75 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 sm:py-3 shadow-lg flex items-center gap-2 sm:gap-3"> */}
        {/*   <button */}
        {/*     className={`p-2 sm:p-3 rounded-full ${isAudioOn ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`} */}
        {/*     onClick={() => isAudioOn ? disableAudio() : enableAudio()} */}
        {/*   > */}
        {/*     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"> */}
        {/*       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /> */}
        {/*     </svg> */}
        {/*   </button> */}
        {/**/}
        {/*   <button */}
        {/*     className={`p-2 sm:p-3 rounded-full ${isVideoOn ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`} */}
        {/*     onClick={() => isVideoOn ? disableVideo() : enableVideo()} */}
        {/*   > */}
        {/*     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"> */}
        {/*       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /> */}
        {/*     </svg> */}
        {/*   </button> */}
        {/**/}
        {/*   <button */}
        {/*     onClick={handleEndSession} */}
        {/*     className="bg-red-600 hover:bg-red-700 text-white p-2 sm:p-3 rounded-full" */}
        {/*   > */}
        {/*     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"> */}
        {/*       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> */}
        {/*     </svg> */}
        {/*   </button> */}
        {/* </div> */}
      </div>
    </div>
  );
}
