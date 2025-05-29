// ~/Projects/charli/apps/vite-frontend/src/pages/room[id]/hooks/useAudioPipeline.ts
import { useEffect, useRef, useState } from "react";

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
// Calculate RMS (Root Mean Square) for volume level
let sum = 0;
for (let i = 0; i < input.length; i++) {
sum += input[i] * input[i];
}
const rms = Math.sqrt(sum / input.length);
const decibels = rms > 0 ? 20 * Math.log10(rms) : -Infinity;

const pcmInt16 = new Int16Array(input.length);
for (let i = 0; i < input.length; i++) {
pcmInt16[i] = Math.max(-32768, Math.min(32767, input[i] * 32767));
}
this.buffer.push(pcmInt16);
this.sampleCount += pcmInt16.length;

// Send volume level to main thread for monitoring
this.port.postMessage({ 
type: 'volume', 
rms: rms, 
decibels: decibels,
timestamp: currentTime 
});

// flush when we have 8 k samples → 16 kB (satisfies Worker limit and 10 msg/s)
if (this.sampleCount >= 8000) {
const chunk = new Uint8Array(
this.buffer.flatMap(b => Array.from(new Uint8Array(b.buffer)))
);
this.port.postMessage({ type: 'audio', data: chunk });
this.buffer = [];
this.sampleCount = 0;
}
}

if (this.flushRequested && this.sampleCount > 0) {
const chunk = new Uint8Array(
this.buffer.flatMap(b => Array.from(new Uint8Array(b.buffer)))
);
this.port.postMessage({ type: 'audio', data: chunk });
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
}: {
    localAudioStream: MediaStream | null;
    isAudioOn: boolean;
    uploadUrl: string | null;
  }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  // Tracks overall pipeline state
  const [isRecording, setIsRecording] = useState(false);
  const [hasCleanedUp, setHasCleanedUp] = useState(false);

  // Ambient noise monitoring
  const [currentVolume, setCurrentVolume] = useState(0);
  const [currentDecibels, setCurrentDecibels] = useState(-Infinity);
  const [ambientNoiseLevel, setAmbientNoiseLevel] = useState(-Infinity);
  const volumeHistoryRef = useRef<number[]>([]);
  const currentDecibelsRef = useRef(-Infinity);
  const ambientNoiseLevelRef = useRef(-Infinity);

  // This was in your original code, if you still need to track session ends
  const endSessionRef = useRef(false);

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

        // Called whenever PCM data or volume info is ready
        worklet.port.onmessage = async (e) => {
          const message = e.data;
          
          if (message.type === 'audio') {
            // Handle audio data upload
            const chunk = message.data as Uint8Array;
            // console.log(`[useAudioPipeline] Sending PCM chunk, size: ${chunk.length}`, new Date().toISOString());

            try {
              const startTime = Date.now();
              const resp = await fetch(uploadUrl, {
                method: "POST",
                body: chunk,
                headers: {
                  'Content-Type': 'application/octet-stream',
                  'X-Audio-Level-DB': currentDecibelsRef.current.toString(),
                  'X-Ambient-Noise-DB': ambientNoiseLevelRef.current.toString()
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
          } else if (message.type === 'volume') {
            // Handle volume monitoring
            const { rms, decibels } = message;
            setCurrentVolume(rms);
            setCurrentDecibels(decibels);
            currentDecibelsRef.current = decibels;
            
            // Track volume history for ambient noise calculation
            volumeHistoryRef.current.push(decibels);
            
            // Keep only last 100 samples (roughly 2-3 seconds at 48kHz)
            if (volumeHistoryRef.current.length > 100) {
              volumeHistoryRef.current.shift();
            }
            
            // Calculate ambient noise level (10th percentile of recent volume)
            if (volumeHistoryRef.current.length >= 20) {
              const sorted = [...volumeHistoryRef.current].filter(v => v !== -Infinity).sort((a, b) => a - b);
              if (sorted.length > 0) {
                const tenthPercentileIndex = Math.floor(sorted.length * 0.1);
                const newAmbientLevel = sorted[tenthPercentileIndex];
                setAmbientNoiseLevel(newAmbientLevel);
                ambientNoiseLevelRef.current = newAmbientLevel;
              }
            }
          }
        };

        // Connect the audio graph
        source.connect(worklet);
        // If you don't want to hear local echo, remove the line below:
        // worklet.connect(audioContext.destination);

        setIsRecording(true);
        console.log("[useAudioPipeline] Recording started", new Date().toISOString());

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
  }, [localAudioStream, isAudioOn, isRecording, uploadUrl, hasCleanedUp]);

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

    // Volume monitoring for debugging Deepgram endpointing
    currentVolume,
    currentDecibels,
    ambientNoiseLevel,
  };
}
