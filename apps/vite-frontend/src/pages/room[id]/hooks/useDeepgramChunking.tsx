// ~/Projects/charli/apps/vite-frontend/src/pages/room[id]/hooks/useDeepgramChunking.tsx
import { useRef, useCallback, useState } from "react";

interface AudioChunk {
  id: string;
  startTime: number;
  endTime: number;
  audioData: Uint8Array;
  isComplete: boolean;
}

interface TranscriptSegment {
  chunkId: string;
  text: string;
  confidence: number;
  isPartial: boolean;
}

interface ChunkedTranscriptSegment {
  chunkId: string;
  speakerRole: string;
  text: string;
  confidence: number;
  startTime: number;
  endTime: number;
  isPartial: boolean;
}

interface UseDeepgramChunkingProps {
  uploadUrl: string | null;
  onTranscriptUpdate: (text: string, isComplete: boolean) => void;
  onError: (error: string) => void;
  speakerRole?: 'learner' | 'teacher';
}

const CHUNK_TARGET_DURATION_MS = 4000; // 4 seconds target
const MAX_CHUNK_DURATION_MS = 4800; // Hard limit at 4.8s
const VAD_SILENCE_THRESHOLD = 0.01; // Amplitude threshold for silence detection
const VAD_SILENCE_DURATION_MS = 300; // Minimum silence duration to trigger chunk boundary
const SAMPLE_RATE = 48000;
const BYTES_PER_SAMPLE = 2; // 16-bit PCM

export function useDeepgramChunking({
  uploadUrl,
  onTranscriptUpdate,
  onError,
  speakerRole = 'learner'
}: UseDeepgramChunkingProps) {
  
  // State for managing chunks and transcripts
  const [isProcessing, setIsProcessing] = useState(false);
  const currentChunkRef = useRef<AudioChunk | null>(null);
  const audioBufferRef = useRef<number[]>([]);
  const chunkCounterRef = useRef(0);
  const utteranceBufferRef = useRef<TranscriptSegment[]>([]);
  const lastSilenceStartRef = useRef<number>(0);
  const currentUtteranceStartRef = useRef<number>(0);
  
  // WebSocket connections for each chunk
  const activeConnectionsRef = useRef<Map<string, {
    ws: WebSocket;
    isComplete: boolean;
    transcript: string;
  }>>(new Map());

  // Voice Activity Detection
  const detectSilence = useCallback((audioSamples: number[]): boolean => {
    if (audioSamples.length === 0) return true;
    
    // Calculate RMS amplitude
    const rms = Math.sqrt(
      audioSamples.reduce((sum, sample) => sum + sample * sample, 0) / audioSamples.length
    );
    
    return rms < VAD_SILENCE_THRESHOLD;
  }, []);

  // Create a new Deepgram WebSocket connection for a chunk
  const createDeepgramConnection = useCallback((chunkId: string, audioChunk: AudioChunk) => {
    if (!uploadUrl) return null;

    const wsURL = new URL('wss://api.deepgram.com/v1/listen');
    wsURL.searchParams.set('model', 'nova-2');
    wsURL.searchParams.set('language', 'es-MX');
    wsURL.searchParams.set('sample_rate', '48000');
    wsURL.searchParams.set('encoding', 'linear16');
    wsURL.searchParams.set('interim_results', 'true');
    wsURL.searchParams.set('endpointing', '500');
    wsURL.searchParams.set('utterance_end_ms', '2000'); // Shorter for chunks
    wsURL.searchParams.set('smart_format', 'false'); // Preserve verbatim
    wsURL.searchParams.set('punctuate', 'false');
    wsURL.searchParams.set('diarize', 'false'); // We know the speaker
    wsURL.searchParams.set('filler_words', 'true');

    // Extract API key from the original upload URL or use environment
    // Note: In production, this should be handled more securely
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
    if (!apiKey) {
      onError('Deepgram API key not configured');
      return null;
    }

    const ws = new WebSocket(wsURL.toString(), ['token', apiKey]);
    (ws as any).binaryType = 'arraybuffer';

    const connectionState = {
      ws,
      isComplete: false,
      transcript: ''
    };

    ws.addEventListener('open', () => {
      console.log(`[DeepgramChunking] WebSocket opened for chunk ${chunkId}`);
      
      // Send the audio data immediately
      ws.send(audioChunk.audioData.buffer);
      
      // Close the stream to finalize
      ws.send(JSON.stringify({ type: "CloseStream" }));
    });

    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'Results') {
          const text = message.channel?.alternatives?.[0]?.transcript;
          const confidence = message.channel?.alternatives?.[0]?.confidence || 0;
          
          if (text) {
            console.log(`[DeepgramChunking] Chunk ${chunkId} transcript: "${text}" (final: ${message.is_final})`);
            
            connectionState.transcript = text;
            
            if (message.is_final) {
              connectionState.isComplete = true;
              
              // Add to utterance buffer
              utteranceBufferRef.current.push({
                chunkId,
                text,
                confidence,
                isPartial: false
              });
              
              // Check if we can assemble a complete utterance
              checkAndAssembleUtterance();
            } else {
              // Handle interim results for real-time display
              utteranceBufferRef.current = utteranceBufferRef.current.filter(seg => seg.chunkId !== chunkId);
              utteranceBufferRef.current.push({
                chunkId,
                text,
                confidence,
                isPartial: true
              });
              
              // Provide interim feedback
              assembleCurrentTranscript(true);
            }
          }
        }
      } catch (err) {
        console.error(`[DeepgramChunking] Error parsing message for chunk ${chunkId}:`, err);
      }
    });

    ws.addEventListener('close', (event) => {
      console.log(`[DeepgramChunking] WebSocket closed for chunk ${chunkId}: ${event.code}`);
      activeConnectionsRef.current.delete(chunkId);
    });

    ws.addEventListener('error', (event) => {
      console.error(`[DeepgramChunking] WebSocket error for chunk ${chunkId}:`, event);
      activeConnectionsRef.current.delete(chunkId);
      onError(`Transcription error for chunk ${chunkId}`);
    });

    activeConnectionsRef.current.set(chunkId, connectionState);
    return ws;
  }, [uploadUrl, onError]);

  // Assemble current transcript from all chunks
  const assembleCurrentTranscript = useCallback((isInterim: boolean = false) => {
    const sortedSegments = utteranceBufferRef.current
      .sort((a, b) => a.chunkId.localeCompare(b.chunkId))
      .filter(seg => seg.text.trim().length > 0);
    
    if (sortedSegments.length === 0) return;
    
    // Simple concatenation with space separation
    let assembledText = sortedSegments.map(seg => seg.text.trim()).join(' ');
    
    // Basic punctuation cleanup at chunk boundaries
    assembledText = assembledText
      .replace(/\.\s+([a-z])/g, '. $1') // Fix mid-sentence periods
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    onTranscriptUpdate(assembledText, !isInterim);
  }, [onTranscriptUpdate]);

  // Send chunked transcript to server
  const sendChunkedTranscript = useCallback(async (segments: TranscriptSegment[], isComplete: boolean) => {
    if (!uploadUrl) return;

    const utteranceId = `utterance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert to server format
    const serverSegments: ChunkedTranscriptSegment[] = segments.map(seg => ({
      chunkId: seg.chunkId,
      speakerRole,
      text: seg.text,
      confidence: seg.confidence,
      startTime: Date.now(), // In a real implementation, track actual start times
      endTime: Date.now(),
      isPartial: seg.isPartial
    }));

    try {
      // Extract roomId from uploadUrl
      const url = new URL(uploadUrl);
      const pathParts = url.pathname.split('/');
      const roomId = pathParts[pathParts.length - 1];
      
      const response = await fetch(`https://learner-assessment-worker.charli.chat/chunked-transcript/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          utteranceId,
          segments: serverSegments,
          isComplete,
          speakerRole
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      console.log(`[DeepgramChunking] Sent ${serverSegments.length} segments to server (complete: ${isComplete})`);
    } catch (err) {
      console.error('[DeepgramChunking] Failed to send chunked transcript:', err);
      onError(`Failed to send transcript: ${err}`);
    }
  }, [uploadUrl, speakerRole, onError]);

  // Check if we can assemble a complete utterance
  const checkAndAssembleUtterance = useCallback(() => {
    const finalSegments = utteranceBufferRef.current.filter(seg => !seg.isPartial);
    const allActiveChunks = Array.from(activeConnectionsRef.current.values());
    const completedChunks = allActiveChunks.filter(conn => conn.isComplete);
    
    // If all active chunks are complete, assemble final utterance
    if (allActiveChunks.length > 0 && completedChunks.length === allActiveChunks.length) {
      console.log('[DeepgramChunking] All chunks complete, assembling final utterance');
      
      // Send to server
      sendChunkedTranscript(finalSegments, true);
      
      // Also provide local feedback
      assembleCurrentTranscript(false);
      
      // Clear utterance buffer for next utterance
      utteranceBufferRef.current = [];
    } else if (utteranceBufferRef.current.length > 0) {
      // Send interim results
      sendChunkedTranscript(utteranceBufferRef.current, false);
      assembleCurrentTranscript(true);
    }
  }, [assembleCurrentTranscript, sendChunkedTranscript]);

  // Create a new audio chunk
  const createNewChunk = useCallback((): AudioChunk => {
    chunkCounterRef.current += 1;
    const now = Date.now();
    
    return {
      id: `chunk_${chunkCounterRef.current}_${now}`,
      startTime: now,
      endTime: 0,
      audioData: new Uint8Array(0),
      isComplete: false
    };
  }, []);

  // Process audio data with chunking logic
  const processAudioData = useCallback((audioData: Uint8Array) => {
    if (!uploadUrl || !isProcessing) return;

    // Convert Uint8Array to number array for VAD analysis
    const samples: number[] = [];
    for (let i = 0; i < audioData.length; i += 2) {
      // Convert 16-bit PCM to normalized float
      const sample = (audioData[i] | (audioData[i + 1] << 8)) / 32768.0;
      samples.push(sample);
    }

    // Add to current audio buffer
    audioBufferRef.current.push(...samples);

    const now = Date.now();
    
    // Initialize first chunk if needed
    if (!currentChunkRef.current) {
      currentChunkRef.current = createNewChunk();
      currentUtteranceStartRef.current = now;
      console.log('[DeepgramChunking] Started new chunk:', currentChunkRef.current.id);
    }

    const chunkDuration = now - currentChunkRef.current.startTime;
    const isSilent = detectSilence(samples);
    
    // Track silence periods
    if (isSilent && lastSilenceStartRef.current === 0) {
      lastSilenceStartRef.current = now;
    } else if (!isSilent) {
      lastSilenceStartRef.current = 0;
    }

    const silenceDuration = lastSilenceStartRef.current > 0 ? now - lastSilenceStartRef.current : 0;
    
    // Decision logic for chunk completion
    let shouldCompleteChunk = false;
    let reason = '';

    if (chunkDuration >= MAX_CHUNK_DURATION_MS) {
      shouldCompleteChunk = true;
      reason = 'max duration reached';
    } else if (chunkDuration >= CHUNK_TARGET_DURATION_MS && silenceDuration >= VAD_SILENCE_DURATION_MS) {
      shouldCompleteChunk = true;
      reason = 'natural pause detected';
    }

    if (shouldCompleteChunk && currentChunkRef.current) {
      // Finalize current chunk
      const chunkAudioData = new Uint8Array(audioBufferRef.current.length * 2);
      for (let i = 0; i < audioBufferRef.current.length; i++) {
        const sample = Math.max(-1, Math.min(1, audioBufferRef.current[i]));
        const int16Sample = Math.round(sample * 32767);
        chunkAudioData[i * 2] = int16Sample & 0xFF;
        chunkAudioData[i * 2 + 1] = (int16Sample >> 8) & 0xFF;
      }

      currentChunkRef.current.audioData = chunkAudioData;
      currentChunkRef.current.endTime = now;
      currentChunkRef.current.isComplete = true;

      console.log(`[DeepgramChunking] Completing chunk ${currentChunkRef.current.id} (${reason}): ${chunkDuration}ms, ${chunkAudioData.length} bytes`);

      // Send to Deepgram
      createDeepgramConnection(currentChunkRef.current.id, currentChunkRef.current);

      // Reset for next chunk
      currentChunkRef.current = null;
      audioBufferRef.current = [];
      lastSilenceStartRef.current = 0;
    }
  }, [uploadUrl, isProcessing, createNewChunk, detectSilence, createDeepgramConnection]);

  // Start processing
  const startProcessing = useCallback(() => {
    console.log('[DeepgramChunking] Starting audio processing');
    setIsProcessing(true);
    currentUtteranceStartRef.current = Date.now();
  }, []);

  // Stop processing and finalize any remaining chunks
  const stopProcessing = useCallback(async () => {
    console.log('[DeepgramChunking] Stopping audio processing');
    setIsProcessing(false);

    // Finalize any remaining chunk
    if (currentChunkRef.current && audioBufferRef.current.length > 0) {
      const chunkAudioData = new Uint8Array(audioBufferRef.current.length * 2);
      for (let i = 0; i < audioBufferRef.current.length; i++) {
        const sample = Math.max(-1, Math.min(1, audioBufferRef.current[i]));
        const int16Sample = Math.round(sample * 32767);
        chunkAudioData[i * 2] = int16Sample & 0xFF;
        chunkAudioData[i * 2 + 1] = (int16Sample >> 8) & 0xFF;
      }

      currentChunkRef.current.audioData = chunkAudioData;
      currentChunkRef.current.endTime = Date.now();
      currentChunkRef.current.isComplete = true;

      console.log(`[DeepgramChunking] Finalizing remaining chunk: ${currentChunkRef.current.id}`);
      createDeepgramConnection(currentChunkRef.current.id, currentChunkRef.current);
    }

    // Wait for any pending connections to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Close all active connections
    activeConnectionsRef.current.forEach(connection => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
    });
    activeConnectionsRef.current.clear();

    // Reset state
    currentChunkRef.current = null;
    audioBufferRef.current = [];
    utteranceBufferRef.current = [];
    chunkCounterRef.current = 0;
  }, [createDeepgramConnection]);

  return {
    processAudioData,
    startProcessing,
    stopProcessing,
    isProcessing
  };
}