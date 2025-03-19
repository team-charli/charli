// AssessmentHooks/useAudioStreaming.ts
import { useEffect, useRef, useState } from 'react';

interface UseAudioStreamingOptions {
  uploadUrl: string;
  timeslice?: number;
}

export function useAudioStreaming(
  localAudioStream: MediaStream | null,
  { uploadUrl, timeslice = 2000 }: UseAudioStreamingOptions
) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!localAudioStream) return;

    try {
      const recorder = new MediaRecorder(localAudioStream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = recorder;

      const handleDataAvailable = async (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          try {
            await fetch(uploadUrl, {
              method: 'POST',
              body: e.data,
            });
          } catch (err) {
            console.error('[useAudioStreaming] Failed to upload chunk:', err);
          }
        }
      };

      recorder.addEventListener('dataavailable', handleDataAvailable);

      // Cleanup
      return () => {
        recorder.removeEventListener('dataavailable', handleDataAvailable);
        mediaRecorderRef.current = null;
      };
    } catch (err) {
      console.error('[useAudioStreaming] Error creating MediaRecorder:', err);
    }
  }, [localAudioStream, uploadUrl]);

  /**
   * Start near real-time recording
   */
  const startRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'inactive') {
      recorder.start(timeslice);
      setIsRecording(true);
      console.log('[useAudioStreaming] Recording started...');
    }
  };

  /**
   * Stop completely and trigger final transcription
   * => sends ?action=end-session
   */
  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      setIsRecording(false);
      console.log('[useAudioStreaming] Recording stopped. Finalizing session...');

      try {
        const endSessionUrl = `${uploadUrl}?action=end-session`;
        await fetch(endSessionUrl, { method: 'POST' });
      } catch (err) {
        console.error('[useAudioStreaming] Final end-session POST failed:', err);
      }
    }
  };

  /**
   * Pause recording WITHOUT finalizing the entire session
   * => stops the MediaRecorder but does NOT send ?action=end-session
   */
  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      setIsRecording(false);
      console.log('[useAudioStreaming] Recording paused (mic off).');
    }
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
    pauseRecording,
  };
}
