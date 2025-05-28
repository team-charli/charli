// ~/Projects/charli/apps/vite-frontend/src/pages/room[id]/hooks/useAudioPipeline.ts
import { useEffect, useRef, useState, useMemo } from "react";
import { useDeepgramChunking } from "./useDeepgramChunking";

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

// flush when we have 8 k samples → 16 kB (satisfies Worker limit and 10 msg/s)
if (this.sampleCount >= 8000) {
const chunk = new Uint8Array(
this.buffer.flatMap(b => Array.from(new Uint8Array(b.buffer)))
);
this.port.postMessage(chunk);
this.buffer = [];
this.sampleCount = 0;
}
}

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

/**
 * Encapsulates all front-end audio capture and streaming to `uploadUrl`.
 */
export function useAudioPipeline({
  localAudioStream,
  isAudioOn,
  uploadUrl,
  onTranscriptUpdate,
  onTranscriptError,
}: {
    localAudioStream: MediaStream | null;
    isAudioOn: boolean;
    uploadUrl: string | null;
    onTranscriptUpdate?: (text: string, isComplete: boolean) => void;
    onTranscriptError?: (error: string) => void;
  }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  // Tracks overall pipeline state
  const [isRecording, setIsRecording] = useState(false);
  const [hasCleanedUp, setHasCleanedUp] = useState(false);

  // This was in your original code, if you still need to track session ends
  const endSessionRef = useRef(false);
  
  // Chunking state
  const useChunking = import.meta.env.VITE_ENABLE_CHUNKING === 'true';
  const audioChunkBuffer = useRef<Uint8Array[]>([]);
  
  // Extract role from uploadUrl
  const extractedRole = useMemo(() => {
    if (!uploadUrl) return 'learner';
    try {
      const url = new URL(uploadUrl);
      const role = url.searchParams.get('role');
      return (role === 'teacher' || role === 'learner') ? role : 'learner';
    } catch {
      return 'learner';
    }
  }, [uploadUrl]);

  // Deepgram chunking hook
  const {
    processAudioData,
    startProcessing: startChunking,
    stopProcessing: stopChunking,
    isProcessing: isChunking
  } = useDeepgramChunking({
    uploadUrl,
    onTranscriptUpdate: onTranscriptUpdate || (() => {}),
    onError: onTranscriptError || (() => {}),
    speakerRole: extractedRole
  });

  /**
   * Sets up the AudioWorklet pipeline
   * once we have a localAudioStream and are actively producing audio.
   */
  useEffect(() => {
    async function startProcessing() {
      if ( !uploadUrl || !localAudioStream || !isAudioOn || isRecording || hasCleanedUp) return;

      try {
        console.log("[useAudioPipeline] Entering startProcessing:", new Date().toISOString());

        const audioContext = new AudioContext({ sampleRate: 48000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(localAudioStream);
        sourceRef.current = source;

        const blob = new Blob([workletScript], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);

        console.log("[useAudioPipeline] Loading AudioWorklet module...", new Date().toISOString());
        await audioContext.audioWorklet.addModule(url);
        console.log("[useAudioPipeline] AudioWorklet module loaded successfully", new Date().toISOString());

        const worklet = new AudioWorkletNode(audioContext, "pcm-processor");
        workletRef.current = worklet;

        // Called whenever PCM data is ready to send
        worklet.port.onmessage = async (e) => {
          const chunk = e.data as Uint8Array;
          
          if (useChunking) {
            // Use Deepgram chunking for continuous transcription
            processAudioData(chunk);
          } else {
            // Original behavior: send directly to server
            try {
              const startTime = Date.now();
              const resp = await fetch(uploadUrl, {
                method: "POST",
                body: chunk,
                headers: {
                  'Content-Type': 'application/octet-stream'
                }
              });
              const endTime = Date.now();

              if (!resp.ok) {
                const errorText = await resp.text();
                console.error(`[useAudioPipeline] PCM upload failed: ${resp.status} - ${errorText}`);
              }
            } catch (err) {
              console.error("[useAudioPipeline] PCM upload network error:", err);
            }
          }
        };

        // Connect the audio graph
        source.connect(worklet);
        // If you don't want to hear local echo, remove the line below:
        // worklet.connect(audioContext.destination);

        setIsRecording(true);
        console.log("[useAudioPipeline] Recording started", new Date().toISOString());
        
        // Start chunking if enabled
        if (useChunking) {
          startChunking();
          console.log("[useAudioPipeline] Deepgram chunking started");
        }

        // Early flush after a short delay:
        setTimeout(() => {
          if (workletRef.current) {
            console.log("[useAudioPipeline] Early flush of PCM data.");
            workletRef.current.port.postMessage({ type: "flush" });
          }
        }, 500);
      } catch (err) {
        console.error("[useAudioPipeline] Worklet setup failed:", err);
      }
    }

    if (localAudioStream && isAudioOn && !isRecording) {
      startProcessing();
    }
  }, [localAudioStream, isAudioOn, isRecording, uploadUrl, hasCleanedUp, uploadUrl]);

  /**
   * Flushes any buffered audio data.
   */
  const flush = async () => {
    if (workletRef.current) {
      console.log("[useAudioPipeline] Requesting flush of remaining PCM data.");
      workletRef.current.port.postMessage({ type: "flush" });
      // Wait a bit for the flush to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  /**
   * Cleans up the entire audio pipeline.
   * Also calls `flush()` right before tearing down.
   */

  const cleanupAudio = async () => {
    console.log("[useAudioPipeline] cleanupAudio called:", new Date().toISOString());
    
    // Stop chunking if enabled
    if (useChunking && isChunking) {
      console.log("[useAudioPipeline] Stopping Deepgram chunking");
      await stopChunking();
    }
    
    await flush();
    if (workletRef.current) workletRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();

    if (audioContextRef.current) {
      await audioContextRef.current.close();
    }

    workletRef.current = null;
    sourceRef.current = null;
    audioContextRef.current = null;

    setIsRecording(false);
    setHasCleanedUp(true);

    console.log("[useAudioPipeline] Audio cleanup completed:", new Date().toISOString());
  };

  return {
    // For the consuming component/hook to know whether
    // we are currently capturing audio or not
    isRecording,

    // For forcibly flushing or tearing down from outside
    flush,
    cleanupAudio,

    // If your "end session" logic still depends on this, we expose it
    endSessionRef,
    
    // Chunking status
    isChunking: useChunking && isChunking,
    useChunking,
  };
}
