// ~/Projects/charli/apps/vite-frontend/src/pages/room[id]/Room.tsx

import { useEffect, useMemo, useRef, useState } from "react";
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
  const { roomRole, hashedLearnerAddress, hashedTeacherAddress, roboTest, learnerId, sessionId, deepgramQA } = useSearch({
    from: "/room/$id",
  });

  // Use the roomId directly - RoboTest already creates unique session IDs
  const roomId = urlRoomId;

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
  
  // Debug logging removed - was causing infinite re-renders
  
  // State for robo teacher captions
  const [roboCaption, setRoboCaption] = useState<string>('');
  const [conversationState, setConversationState] = useState<'initializing' | 'ready' | 'idle' | 'listening' | 'deepgram_processing' | 'thinking_time_system' | 'llama_processing' | 'elevenlabs_processing'>('initializing');
  const [thinkingTimeRemaining, setThinkingTimeRemaining] = useState<number | null>(null);
  const [deepgramReady, setDeepgramReady] = useState(false);
  // Prevent constant re-initialization of listening state
  const hasInitialized = useRef(false);

  // 🔍 VERBATIM QA: Cue-card system state
  const [cueCards, setCueCards] = useState<any[]>([]);
  const [activeCueCard, setActiveCueCard] = useState<any>(null);
  const [isVerbatimMode, setIsVerbatimMode] = useState(deepgramQA === 'true');
  const [cueCardsLoaded, setCueCardsLoaded] = useState(false);
  const [isDeepgramQAMode, setIsDeepgramQAMode] = useState(deepgramQA === 'true');
  
  // 🔍 DICTATION SCRIPT: State for extended conversation scripts
  const [dictationScript, setDictationScript] = useState<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);


  const uploadUrl = useMemo(() => {
    if (!localPeerId) return null;
    let url =  `https://learner-assessment-worker.charli.chat/audio/${roomId}?peerId=${localPeerId}&role=${roomRole}`;

    if (isRoboMode || isDeepgramQAMode) {
      url += `&roboMode=true`;
      // Add the learnerId and sessionId if available from RoboTest mode
      if (learnerId) url += `&learnerId=${learnerId}`;
      if (sessionId) url += `&sessionId=${sessionId}`;
      
      // Add flag to skip scorecard generation in Deepgram QA mode
      if (isDeepgramQAMode) {
        url += `&skipScorecard=true`;
      }
    }

    return url;
  }, [roomId, localPeerId, roomRole, isRoboMode, learnerId, sessionId, isDeepgramQAMode]);

  // Log the uploadUrl for debugging
  useEffect(() => {
    console.log('[Room] uploadUrl:', uploadUrl);
  }, [uploadUrl]);

  // 🔍 VERBATIM QA: Fetch cue-cards OR dictation script on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isDeepgramQAMode) {
          // Fetch dictation script for QA mode
          console.log('[DICTATION-SCRIPT] Fetching dictation script from backend');
          const response = await fetch('https://learner-assessment-worker.charli.chat/dictation-scripts');
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const data = await response.json();
          console.log(`[DICTATION-SCRIPT] Loaded dictation script: ${data.script?.title}`);
          setDictationScript(data.script);
          setScriptLoaded(true);
        } else {
          // Fetch cue-cards for verbatim mode
          console.log('[CUE-CARDS] Fetching cue-cards from backend');
          const response = await fetch('https://learner-assessment-worker.charli.chat/cue-cards');
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const data = await response.json();
          console.log(`[CUE-CARDS] Loaded ${data.total} cue-cards in ${data.categories.length} categories`);
          setCueCards(data.cueCards);
          setCueCardsLoaded(true);
        }
      } catch (error) {
        console.error('[VERBATIM-QA] Failed to fetch data:', error);
        setCueCardsLoaded(true);
        setScriptLoaded(true); // Still mark as loaded to prevent infinite retries
      }
    };

    fetchData();
  }, [isDeepgramQAMode]);

  // 🔍 VERBATIM QA: Set active cue-card for backend analysis
  const setActiveCueCardForSession = async (cueCard: any) => {
    if (!roomId) {
      console.error('[CUE-CARDS] No roomId available for setting active cue-card');
      return;
    }

    try {
      console.log(`[CUE-CARDS] Setting active cue-card for session: ${cueCard.id}`);
      const response = await fetch(`https://learner-assessment-worker.charli.chat/cue-cards/${roomId}/set-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cueCardId: cueCard.id })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('[CUE-CARDS] Backend confirmed active cue-card:', result.activeCueCard?.id);
      setActiveCueCard(cueCard);
    } catch (error) {
      console.error('[CUE-CARDS] Failed to set active cue-card:', error);
    }
  };

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
    } else {
      console.log("[Room] => Audio is already on with uploadUrl:", uploadUrl);
    }
  }, [uploadUrl, isAudioOn, enableAudio]);

  /** 6b) When BOTH mic is enabled AND Deepgram is ready, show "Ready" */
  useEffect(() => {
    if ((isRoboMode || isDeepgramQAMode) && isAudioOn && deepgramReady && !hasInitialized.current) {
      console.log("[Room] Both mic and Deepgram ready - showing Ready");
      hasInitialized.current = true;
      setConversationState('ready');
      // Stay in ready state, don't auto-transition
    }
  }, [isAudioOn, deepgramReady, isRoboMode, isDeepgramQAMode]);

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
    if (isRoboMode || isDeepgramQAMode) {
      audioContext = new AudioContext();
      console.log("[TranscriptListener] AudioContext created for robo/QA mode");
    }

    const ws = new WebSocket(`wss://learner-assessment-worker.charli.chat/connect/${roomId}`);
    ws.onopen = () => console.log("[TranscriptListener] WebSocket connected.");
    ws.onmessage = async (evt) => {
      const message = JSON.parse(evt.data);
      switch (message.type) {
        case "partialTranscript":
          console.log("[TranscriptListener] Partial transcript:", JSON.stringify(message.data, null, 2));
          break;
        case "transcription-complete":
          console.log("[TranscriptListener] Transcription complete:", JSON.stringify(message.data, null, 2));
          break;
        case "transcription-error":
          console.error("[TranscriptListener] Transcription error:", JSON.stringify(message.data, null, 2));
          break;
        case "roboReplyText":
          console.log("[TranscriptListener] Robo reply text:", message.data.text, "utteranceId:", message.data.utteranceId);
          // Update robo captions - let CSS handle transitions
          if (message.data.text) {
            setRoboCaption(message.data.text);
          }
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
              console.log("[TranscriptListener] ⏳ Starting robo audio decode/playback process");
              
              // Convert base64 MP3 to binary
              const mp3Binary = Uint8Array.from(atob(message.data.mp3Base64), (c) => c.charCodeAt(0));
              console.log("[TranscriptListener] Decoded MP3 binary length:", mp3Binary.length);
              
              // Force AudioContext to resume if suspended (coordinate with recording)
              if (audioContext.state === 'suspended') {
                console.log("[TranscriptListener] 🔊 Resuming suspended AudioContext for playback");
                await audioContext.resume();
              }
              
              // Decode and play the MP3 audio with error handling
              const audioBuffer = await audioContext.decodeAudioData(mp3Binary.buffer);
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              
              // Add error handling and completion logging
              source.onended = () => {
                console.log(`[TranscriptListener] ✅ Robo audio playback completed for utteranceId: ${message.data.utteranceId}`);
              };
              
              source.onerror = (err) => {
                console.error(`[TranscriptListener] ❌ Audio source error for utteranceId: ${message.data.utteranceId}`, err);
              };
              
              source.connect(audioContext.destination);
              source.start(0); // Start immediately
              console.log(`[TranscriptListener] 🎵 Robo audio playback started for utteranceId: ${message.data.utteranceId}`);
            } catch (err) {
              console.error("[TranscriptListener] ❌ Error playing robo audio:", err);
              // Additional debugging for AudioContext state
              console.log("[TranscriptListener] AudioContext state:", audioContext.state);
              console.log("[TranscriptListener] AudioContext sample rate:", audioContext.sampleRate);
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
        case "deepgramListening":
          console.log("[TranscriptListener] Deepgram is listening - setting deepgramReady to true");
          setDeepgramReady(true);
          break;
        case "processingState":
          console.log("[TranscriptListener] Processing state:", message.data.state);
          setConversationState(message.data.state as any);
          if (message.data.state === 'thinking_time_system' && message.data.remainingTime) {
            setThinkingTimeRemaining(message.data.remainingTime);
          } else {
            setThinkingTimeRemaining(null);
          }
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
  }, [roomId, isRoboMode, isDeepgramQAMode, showOverlay, showAnswer]);

  /** 11) Leave the room */
  const { leaveRoom } = useRoomLeave(roomId);

  async function handleEndSession() {
    console.log("[Room] => handleEndSession => called");
    console.log("[Room] => uploadUrl at time of call:", uploadUrl);
    console.log("[Room] => localPeerId:", localPeerId);
    console.log("[Room] => roomRole:", roomRole);
    try {
      // CRITICAL: Trigger end-session FIRST while Deepgram connection is still active
      let scorecardData = null;
      if (uploadUrl) {
        const endUrl = `${uploadUrl}&action=end-session`;
        console.log("[Room] => triggering server end-session BEFORE cleanup:", endUrl);
        const response = await fetch(endUrl, { method: "POST" });
        console.log("[Room] => fetch response status:", response.status);
        if (!response.ok) throw new Error(`Server end-session failed: ${response.status}`);
        
        // Read the response body to get scorecard data
        const responseData = await response.json();
        scorecardData = responseData;
        console.log("[Room] => server end-session completed successfully, scorecard:", responseData?.scorecard ? 'generated' : 'null');
      } else {
        console.error("[Room] => ❌ CRITICAL: uploadUrl is null/undefined - cannot trigger end-session!");
      }

      // Now cleanup audio and leave room AFTER scorecard generation is triggered
      // flush pipeline if recording
      if (isRecording) await cleanupAudio();
      // turn off audio
      if (isAudioOn) await disableAudio();
      // turn off video if on
      if (isVideoOn) await disableVideo();

      leaveRoom();
      console.log("[Room] => left Huddle01 room successfully");
      return scorecardData;
    } catch (err) {
      console.error("[Room] => end session error:", err);
      return null;
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
          {/* Debug info removed - was causing infinite re-renders */}
          
          {isRoboMode || isDeepgramQAMode ? (
            <div className="h-full flex flex-col">
              <div className="text-center bg-gray-900 bg-opacity-70 rounded-lg p-6 sm:p-8 max-w-4xl w-full mx-auto flex-grow flex flex-col">
                {/* Header with mode toggle */}
                <div className="flex justify-between items-center mb-4">
                  <div className="text-6xl">🦸‍♀️</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsVerbatimMode(false);
                        setIsDeepgramQAMode(false);
                      }}
                      className={`px-4 py-2 rounded ${!isDeepgramQAMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                      🤖 Robo Mode
                    </button>
                    <button
                      onClick={() => {
                        setIsVerbatimMode(true);
                        setIsDeepgramQAMode(true);
                      }}
                      className={`px-3 py-2 rounded text-sm ${isDeepgramQAMode ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                      🔬 Deepgram QA
                    </button>
                  </div>
                </div>

                {isVerbatimMode ? (
                  /* 🔍 VERBATIM QA MODE: Split captions display */
                  <div className="flex-grow flex flex-col gap-4">
                    {/* Top half: Display script or cue-card based on mode */}
                    <div className="flex-1 bg-purple-900 bg-opacity-50 rounded-lg p-4 border-2 border-purple-500">
                      {isDeepgramQAMode ? (
                        /* DICTATION SCRIPT MODE: No selection, show full script */
                        <div>
                          <h3 className="text-lg font-semibold text-purple-300 mb-4">📖 Dictation Script - Follow This Conversation</h3>
                          {scriptLoaded && dictationScript ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              <div className="text-center mb-4">
                                <h4 className="text-xl font-bold text-white">{dictationScript.title}</h4>
                                <p className="text-sm text-purple-200">{dictationScript.description}</p>
                              </div>
                              
                              {dictationScript.turns.map((turn: any) => (
                                <div key={turn.turnNumber} className={`p-3 rounded-lg ${
                                  turn.speaker === 'learner' 
                                    ? 'bg-blue-800 bg-opacity-50 border-l-4 border-blue-400' 
                                    : 'bg-green-800 bg-opacity-50 border-l-4 border-green-400'
                                }`}>
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                      <span className="text-xs font-bold text-gray-300">
                                        Turn #{turn.turnNumber}
                                      </span>
                                      <div className={`text-xs ${
                                        turn.speaker === 'learner' ? 'text-blue-300' : 'text-green-300'
                                      }`}>
                                        ({turn.speaker})
                                      </div>
                                    </div>
                                    <div className="flex-grow">
                                      <div className="text-white font-medium mb-1">
                                        "{turn.expectedText}"
                                      </div>
                                      <div className="text-xs text-gray-300">
                                        {turn.description}
                                      </div>
                                      {turn.errorTypes.length > 0 && (
                                        <div className="text-xs text-orange-300 mt-1">
                                          Errors: {turn.errorTypes.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-purple-300 py-8">
                              {scriptLoaded ? (
                                "No dictation script available"
                              ) : (
                                "Loading dictation script..."
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* CUE CARD MODE: Original selection interface */
                        <div>
                          <div className="mb-3">
                            <h3 className="text-lg font-semibold text-purple-300 mb-2">📋 Cue Card - Read This Text</h3>
                            {cueCardsLoaded && (
                              <select
                                className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
                                value={activeCueCard?.id || ''}
                                onChange={(e) => {
                                  const selectedCard = cueCards.find(card => card.id === e.target.value);
                                  if (selectedCard) {
                                    setActiveCueCardForSession(selectedCard);
                                  }
                                }}
                              >
                                <option value="">Select a cue-card...</option>
                                {cueCards.map(card => (
                                  <option key={card.id} value={card.id}>
                                    {card.id} - {card.description}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          
                          {activeCueCard ? (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-white mb-2 p-4 bg-gray-800 rounded">
                                "{activeCueCard.expectedText}"
                              </div>
                              <div className="text-sm text-purple-200">
                                <strong>Category:</strong> {activeCueCard.category} | 
                                <strong> Errors:</strong> {activeCueCard.errorTypes.join(', ')}
                              </div>
                              <div className="text-xs text-purple-300 mt-1">
                                {activeCueCard.description}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-purple-300 py-8">
                              {cueCardsLoaded ? (
                                "Select a cue-card above to begin verbatim testing"
                              ) : (
                                "Loading cue-cards..."
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom half: Live transcription */}
                    <div className="flex-1 bg-gray-800 bg-opacity-50 rounded-lg p-4 border-2 border-gray-500">
                      <h3 className="text-lg font-semibold text-gray-300 mb-3">🎙️ Live Deepgram Transcription</h3>
                      <div className="text-center">
                        <div 
                          className="text-white transition-all duration-500 ease-in-out min-h-[60px] flex items-center justify-center"
                          style={{ 
                            fontSize: '24px', 
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                            fontWeight: '500',
                            lineHeight: '1.4',
                            opacity: roboCaption ? 1 : 0.5
                          }}
                        >
                          {roboCaption || 'Waiting for speech...'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* NORMAL ROBO MODE: Original single caption display */
                  <div className="flex-grow flex items-center justify-center">
                    <div 
                      className="text-white transition-all duration-500 ease-in-out"
                      style={{ 
                        fontSize: '32px', 
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                        fontWeight: '500',
                        lineHeight: '1.4',
                        opacity: roboCaption ? 1 : 0.5
                      }}
                    >
                      {roboCaption || ''}
                    </div>
                  </div>
                )}

                {/* Tips at bottom */}
                <div className="bg-gray-800 bg-opacity-70 rounded-lg p-4 mt-6">
                  {conversationState === 'listening' && (
                    <div className="text-center">
                      <div className="text-sm text-gray-400">Please speak</div>
                    </div>
                  )}
                  
                  {conversationState === 'deepgram_processing' && (
                    <div className="text-center">
                      <div className="text-xl text-white font-bold tracking-wide">DEEPGRAM PROCESSING...</div>
                    </div>
                  )}
                  
                  {conversationState === 'thinking_time_system' && (
                    <div className="text-center">
                      <div className="text-xl text-white font-bold tracking-wide mb-2">THINKING TIME SYSTEM ACTIVE</div>
                      <div className="text-sm text-gray-300">
                        {thinkingTimeRemaining ? 
                          `${Math.ceil(thinkingTimeRemaining / 1000)}s remaining - encourages thoughtful responses` :
                          'Pedagogical delay to encourage thoughtful responses'
                        }
                      </div>
                    </div>
                  )}
                  
                  {conversationState === 'llama_processing' && (
                    <div className="text-center">
                      <div className="text-xl text-white font-bold tracking-wide">LLAMA PROCESSING...</div>
                      <div className="text-sm text-gray-300">AI generating Spanish response</div>
                    </div>
                  )}
                  
                  {conversationState === 'elevenlabs_processing' && (
                    <div className="text-center">
                      <div className="text-xl text-white font-bold tracking-wide">ELEVENLABS PROCESSING...</div>
                      <div className="text-sm text-gray-300">Converting text to speech</div>
                    </div>
                  )}
                  
                  
                  {conversationState === 'initializing' && (
                    <div className="text-center">
                      <div className="text-sm text-gray-400"></div>
                    </div>
                  )}
                  
                  {conversationState === 'ready' && (
                    <div className="text-center">
                      <div className="text-lg text-green-400 font-semibold">✅ READY</div>
                      <div className="text-xs text-gray-300 mt-1">Ready to listen</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : remotePeerIds.length === 0 ? (
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
