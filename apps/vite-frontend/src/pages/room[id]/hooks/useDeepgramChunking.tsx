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
const VAD_SILENCE_DURATION_MS = 500; // Minimum silence duration to trigger chunk boundary (increased)
const UTTERANCE_END_SILENCE_MS = 1500; // Silence duration to mark utterance as complete
const EARLY_FINALIZATION_MS = 1000; // Allow early chunk finalization after this silence
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
  
  // Utterance lifecycle management
  const currentUtteranceIdRef = useRef<string | null>(null);
  const utteranceEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUtteranceCompleteRef = useRef(false);
  const lastChunkEndTimeRef = useRef<number>(0);
  
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

  // Generate a new utterance ID
  const generateUtteranceId = useCallback(() => {
    return `utterance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Start a new utterance
  const startNewUtterance = useCallback(() => {
    if (currentUtteranceIdRef.current) {
      console.log('[DeepgramChunking] Warning: Starting new utterance while previous still active');
    }
    
    currentUtteranceIdRef.current = generateUtteranceId();
    isUtteranceCompleteRef.current = false;
    currentUtteranceStartRef.current = Date.now();
    
    // Clear any existing end timer
    if (utteranceEndTimerRef.current) {
      clearTimeout(utteranceEndTimerRef.current);
      utteranceEndTimerRef.current = null;
    }
    
    console.log(`[DeepgramChunking] Started new utterance: ${currentUtteranceIdRef.current}`);
    return currentUtteranceIdRef.current;
  }, [generateUtteranceId]);


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
      .sort((a, b) => {
        // Extract timestamps from chunkId for proper ordering (chunk_1_timestamp)
        const timestampA = parseInt(a.chunkId.split('_').pop() || '0');
        const timestampB = parseInt(b.chunkId.split('_').pop() || '0');
        return timestampA - timestampB;
      })
      .filter(seg => seg.text.trim().length > 0);
    
    if (sortedSegments.length === 0) return;
    
    // Simple concatenation with space separation
    let assembledText = sortedSegments.map(seg => seg.text.trim()).join(' ');
    
    // Minimal cleanup - preserve verbatim content as required
    assembledText = assembledText
      .replace(/\s+/g, ' ') // Normalize whitespace only
      .trim();
    
    onTranscriptUpdate(assembledText, !isInterim);
  }, [onTranscriptUpdate]);

  // Send chunked transcript to server
  const sendChunkedTranscript = useCallback(async (utteranceId: string, segments: TranscriptSegment[], isComplete: boolean) => {
    if (!uploadUrl || !utteranceId) return;
    
    // Convert to server format with proper timing
    const serverSegments: ChunkedTranscriptSegment[] = segments.map(seg => {
      // Extract timestamp from chunkId for proper ordering
      const chunkTimestamp = seg.chunkId.split('_').pop();
      const startTime = chunkTimestamp ? parseInt(chunkTimestamp) : Date.now();
      
      return {
        chunkId: seg.chunkId,
        speakerRole,
        text: seg.text,
        confidence: seg.confidence,
        startTime,
        endTime: startTime + 100, // Approximate end time
        isPartial: seg.isPartial
      };
    });

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

  // Schedule utterance completion after silence
  const scheduleUtteranceEnd = useCallback((delayMs: number) => {
    if (utteranceEndTimerRef.current) {
      clearTimeout(utteranceEndTimerRef.current);
    }
    
    utteranceEndTimerRef.current = setTimeout(() => {
      if (!isUtteranceCompleteRef.current && currentUtteranceIdRef.current) {
        console.log(`[DeepgramChunking] Auto-completing utterance after ${delayMs}ms silence: ${currentUtteranceIdRef.current}`);
        finalizeCurrentUtterance();
      }
    }, delayMs);
  }, []);

  // Finalize the current utterance
  const finalizeCurrentUtterance = useCallback(() => {
    if (!currentUtteranceIdRef.current || isUtteranceCompleteRef.current) {
      return;
    }

    console.log(`[DeepgramChunking] Finalizing utterance: ${currentUtteranceIdRef.current}`);
    
    const finalSegments = utteranceBufferRef.current.filter(seg => !seg.isPartial);
    if (finalSegments.length > 0) {
      sendChunkedTranscript(currentUtteranceIdRef.current, finalSegments, true);
      assembleCurrentTranscript(false);
    }

    // Mark as complete and clean up
    isUtteranceCompleteRef.current = true;
    utteranceBufferRef.current = [];
    
    if (utteranceEndTimerRef.current) {
      clearTimeout(utteranceEndTimerRef.current);
      utteranceEndTimerRef.current = null;
    }
    
    // Reset for next utterance
    currentUtteranceIdRef.current = null;
  }, [sendChunkedTranscript, assembleCurrentTranscript]);

  // Check if we can assemble a complete utterance
  const checkAndAssembleUtterance = useCallback(() => {
    if (!currentUtteranceIdRef.current) {
      return; // No active utterance
    }

    const finalSegments = utteranceBufferRef.current.filter(seg => !seg.isPartial);
    const allActiveChunks = Array.from(activeConnectionsRef.current.values());
    const completedChunks = allActiveChunks.filter(conn => conn.isComplete);
    
    // Send interim results if we have any segments
    if (utteranceBufferRef.current.length > 0 && !isUtteranceCompleteRef.current) {
      sendChunkedTranscript(currentUtteranceIdRef.current, utteranceBufferRef.current, false);
      assembleCurrentTranscript(true);
    }
    
    // Don't auto-finalize just because chunks are complete
    // Wait for proper silence detection or explicit stop
    console.log(`[DeepgramChunking] Chunk completed, ${completedChunks.length}/${allActiveChunks.length} chunks done`);
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
    const isSilent = detectSilence(samples);
    
    // Start new utterance if we don't have one
    if (!currentUtteranceIdRef.current && !isSilent) {
      startNewUtterance();
    }
    
    // Initialize first chunk if needed
    if (!currentChunkRef.current && !isSilent) {
      currentChunkRef.current = createNewChunk();
      console.log('[DeepgramChunking] Started new chunk:', currentChunkRef.current.id);
    }

    if (!currentChunkRef.current) return; // No chunk to process

    const chunkDuration = now - currentChunkRef.current.startTime;
    
    // Track silence periods
    if (isSilent && lastSilenceStartRef.current === 0) {
      lastSilenceStartRef.current = now;
    } else if (!isSilent) {
      // Clear any pending utterance end timer since user is speaking
      if (utteranceEndTimerRef.current) {
        clearTimeout(utteranceEndTimerRef.current);
        utteranceEndTimerRef.current = null;
      }
      lastSilenceStartRef.current = 0;
    }

    const silenceDuration = lastSilenceStartRef.current > 0 ? now - lastSilenceStartRef.current : 0;
    
    // Decision logic for chunk completion
    let shouldCompleteChunk = false;
    let reason = '';

    // Early finalization for short utterances
    if (silenceDuration >= EARLY_FINALIZATION_MS && chunkDuration >= 1000) {
      shouldCompleteChunk = true;
      reason = 'early finalization - user stopped speaking';
    }
    // Max duration reached (hard limit)
    else if (chunkDuration >= MAX_CHUNK_DURATION_MS) {
      shouldCompleteChunk = true;
      reason = 'max duration reached';
    }
    // Natural pause at target duration
    else if (chunkDuration >= CHUNK_TARGET_DURATION_MS && silenceDuration >= VAD_SILENCE_DURATION_MS) {
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
      lastChunkEndTimeRef.current = now;

      console.log(`[DeepgramChunking] Completing chunk ${currentChunkRef.current.id} (${reason}): ${chunkDuration}ms, ${chunkAudioData.length} bytes`);

      // Send to Deepgram
      createDeepgramConnection(currentChunkRef.current.id, currentChunkRef.current);

      // Reset for next chunk
      currentChunkRef.current = null;
      audioBufferRef.current = [];
      lastSilenceStartRef.current = 0;
      
      // Schedule utterance end if there's been sufficient silence
      if (silenceDuration >= EARLY_FINALIZATION_MS) {
        scheduleUtteranceEnd(UTTERANCE_END_SILENCE_MS - silenceDuration);
      }
    }
    
    // Schedule utterance end for ongoing silence (without completing chunk)
    if (silenceDuration >= UTTERANCE_END_SILENCE_MS && currentUtteranceIdRef.current && !utteranceEndTimerRef.current) {
      console.log('[DeepgramChunking] Long silence detected, scheduling utterance end');
      scheduleUtteranceEnd(100); // Very short delay since we've already waited
    }
  }, [uploadUrl, isProcessing, createNewChunk, detectSilence, createDeepgramConnection, startNewUtterance, scheduleUtteranceEnd]);

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

    // Finalize any pending utterance
    if (currentUtteranceIdRef.current && !isUtteranceCompleteRef.current) {
      finalizeCurrentUtterance();
    }

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

    // Clear any pending timers
    if (utteranceEndTimerRef.current) {
      clearTimeout(utteranceEndTimerRef.current);
      utteranceEndTimerRef.current = null;
    }

    // Reset state
    currentChunkRef.current = null;
    audioBufferRef.current = [];
    utteranceBufferRef.current = [];
    chunkCounterRef.current = 0;
    currentUtteranceIdRef.current = null;
    isUtteranceCompleteRef.current = false;
    lastSilenceStartRef.current = 0;
    lastChunkEndTimeRef.current = 0;
  }, [createDeepgramConnection, finalizeCurrentUtterance]);

  return {
    processAudioData,
    startProcessing,
    stopProcessing,
    isProcessing
  };
}