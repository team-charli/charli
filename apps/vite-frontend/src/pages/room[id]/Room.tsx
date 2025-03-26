// Room.tsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearch } from '@tanstack/react-router';
import { useLocalVideo, useLocalAudio } from '@huddle01/react/hooks';
import { useVerifiyRoleAndAddress } from './hooks/useVerifiyRoleAndAddress';
import { useRoomJoin } from './hooks/useRoomJoin';
import { useRoomLeave } from './hooks/useRoomLeave';
import useBellListener from './hooks/useBellListener';
import LocalPeerView from './Components/LocalPeerView';
import ControlRibbon from './Components/ControlRibbon';
import { useComprehensiveHuddleMonitor } from './hooks/usePeerConnectionMonitor';

// Updated worklet script with flush support.
const workletScript = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.sampleCount = 0;
    this.flushRequested = false;
    // Listen for flush command from the main thread.
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === 'flush') {
        this.flushRequested = true;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    if (input) {
      const pcmInt16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        pcmInt16[i] = Math.max(-32768, Math.min(32767, input[i] * 32767));
      }
      this.buffer.push(pcmInt16);
      this.sampleCount += pcmInt16.length;

      // When enough samples have accumulated, send a full chunk.
      if (this.sampleCount >= 64000) {
        const chunk = new Uint8Array(
          this.buffer.flatMap(b => Array.from(new Uint8Array(b.buffer)))
        );
        this.port.postMessage(chunk);
        this.buffer = [];
        this.sampleCount = 0;
      }
    }

    // If a flush was requested and there is remaining data, send it.
    if (this.flushRequested && this.sampleCount > 0) {
      const chunk = new Uint8Array(
        this.buffer.flatMap(b => Array.from(new Uint8Array(b.buffer)))
      );
      this.port.postMessage(chunk);
      this.buffer = [];
      this.sampleCount = 0;
      this.flushRequested = false;
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;

export default function Room() {
  const { id: roomId } = useParams({ from: '/room/$id' });
  const { roomRole, hashedLearnerAddress, hashedTeacherAddress } = useSearch({ from: '/room/$id' });
  const uploadUrl = `https://learner-assessment-worker.charli.chat/audio/${roomId}`;

  const { data: verifiedRoleAndAddressData } = useVerifiyRoleAndAddress(
    hashedTeacherAddress,
    hashedLearnerAddress,
    roomRole
  );

  const { roomJoinState } = useRoomJoin(roomId, { verifiedRoleAndAddressData });
  const { leaveRoom } = useRoomLeave(roomId);
  useBellListener();

  const isRoomConnected = roomJoinState === 'connected';

  const { stream: localVideoStream, disableVideo } = useLocalVideo();
  const { stream: localAudioStream, isProducing, disableAudio } = useLocalAudio({
    onProduceStart: () => {
      console.log('[useLocalAudio] Audio producing started', new Date().toISOString());
    },
    onProduceClose: () => {
      console.log('[useLocalAudio] Audio producing stopped', new Date().toISOString());
      if (isRecording) cleanupAudio();
      if (!endSessionRef.current) handleEndSession();
    },
  });

  const endSessionRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [hasCleanedUp, setHasCleanedUp] = useState(false);

  useEffect(() => {
    async function startProcessing() {
      if (!localAudioStream || hasCleanedUp) return;
      try {
        console.log('[Room] Entering startProcessing', new Date().toISOString());

        const audioContext = new AudioContext({ sampleRate: 48000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(localAudioStream);
        sourceRef.current = source;

        const blob = new Blob([workletScript], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        console.log('[Room] Loading AudioWorklet module...', new Date().toISOString());
        await audioContext.audioWorklet.addModule(url);
        console.log('[Room] AudioWorklet module loaded successfully', new Date().toISOString());

        const worklet = new AudioWorkletNode(audioContext, 'pcm-processor');
        workletRef.current = worklet;

        worklet.port.onmessage = async (e) => {
          const chunk = e.data as Uint8Array;
          console.log(`[Room] Sending PCM chunk, size: ${chunk.length}`, new Date().toISOString());
          try {
            const response = await fetch(uploadUrl, { method: 'POST', body: chunk });
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[Room] PCM upload failed: ${response.status} - ${errorText}`);
            }
          } catch (err) {
            console.error('[Room] PCM upload network error:', err);
          }
        };

        source.connect(worklet);
        worklet.connect(audioContext.destination);

        setIsRecording(true);
        console.log('[Room] Recording started', new Date().toISOString());

        // **Early Flush:** After a short delay, flush any buffered PCM data to capture early audio.
        setTimeout(() => {
          if (workletRef.current) {
            console.log('[Room] Early flush of PCM data.');
            workletRef.current.port.postMessage({ type: 'flush' });
          }
        }, 500); // Adjust this delay (in ms) as needed

      } catch (err) {
        console.error('[Room] Worklet setup failed:', err);
      }
    }

    if (localAudioStream && isProducing && !isRecording) {
      startProcessing();
    }
  }, [localAudioStream, isProducing, isRecording, uploadUrl]);

  useComprehensiveHuddleMonitor(localAudioStream);

  useEffect(() => {
    console.log('[Room] useEffect triggered', {
      localAudioStream: !!localAudioStream,
      isProducing,
      isRecording,
      timestamp: new Date().toISOString(),
    });
  }, [localAudioStream, isProducing, isRecording]);

  useEffect(() => {
    const ws = new WebSocket(`wss://learner-assessment-worker.charli.chat/connect/${roomId}`);
    ws.onopen = () => console.log('[TranscriptListener] WebSocket connected.');
    ws.onmessage = (evt) => {
      const message = JSON.parse(evt.data);
      switch (message.type) {
        case 'partialTranscript':
          console.log('[TranscriptListener] Partial transcript:', message.data);
          break;
        case 'transcription-complete':
          console.log('[TranscriptListener] Transcription complete:', message.data);
          break;
        case 'transcription-error':
          console.error('[TranscriptListener] Transcription error:', message.data.error);
          break;
        default:
          console.warn('[TranscriptListener] Unknown message type:', message.type);
      }
    };
    ws.onerror = (err) => console.error('[TranscriptListener] WebSocket error:', err);
    return () => ws.close();
  }, [roomId]);

  const cleanupAudio = () => {
    if (workletRef.current) workletRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    workletRef.current = null;
    sourceRef.current = null;
    audioContextRef.current = null;
    setIsRecording(false);
    setHasCleanedUp(true);
    console.log('[Room] Audio cleanup completed', new Date().toISOString());
  };

  const handleEndSession = async () => {
    endSessionRef.current = true;
    console.log('[Room] End Session initiated', new Date().toISOString());

    try {
      if (isProducing) {
        await disableAudio();
      }
      // Before cleanup, flush any remaining PCM data from the worklet.
      if (workletRef.current) {
        console.log('[Room] Requesting flush of remaining PCM data.');
        workletRef.current.port.postMessage({ type: 'flush' });
        // Wait a short moment to allow the flush to complete.
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (isRecording) {
        cleanupAudio();
      } else {
        console.warn('[Room] No active audio to stop', new Date().toISOString());
      }

      await disableVideo(); // Ensure video is stopped before leaving.
      leaveRoom(); // Synchronous call.
      console.log('[Room] Successfully left Huddle01 room', new Date().toISOString());

      const response = await fetch(`${uploadUrl}?action=end-session`, { method: 'POST' });
      if (!response.ok) throw new Error('Server finalization failed');
      console.log('[Room] Server finalization triggered', new Date().toISOString());
    } catch (err) {
      console.error('[Room] End-session error:', err);
    }
  };

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
            isRecording={isRecording}
          />
        </div>
        <div className="flex-1 min-w-0 border-l border-gray-700 p-4 flex flex-col gap-4">
          {/* Additional UI or info could go here */}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <ControlRibbon />
      </div>
    </div>
  );
}
