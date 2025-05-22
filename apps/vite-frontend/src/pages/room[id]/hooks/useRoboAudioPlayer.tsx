// apps/vite-frontend/src/pages/room[id]/hooks/useRoboAudioPlayer.tsx

import { useEffect, useRef } from "react";

export function useRoboAudioPlayer(isRoboMode: boolean, roomId: string) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Only setup the WebSocket when RoboMode is true
    if (!isRoboMode) {
      console.log("[useRoboAudioPlayer] RoboMode is disabled, not setting up WebSocket");
      return;
    }

    console.log(`[useRoboAudioPlayer] Setting up for room ${roomId}, roboMode: ${isRoboMode}`);

    try {
      // Initialize AudioContext
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      console.log("[useRoboAudioPlayer] AudioContext created successfully");
      
      // Create a test tone to verify audio is working
      const oscillator = audioCtx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
      oscillator.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
      console.log("[useRoboAudioPlayer] Test tone played");

      // Set up WebSocket
      const wsUrl = `wss://learner-assessment-worker.charli.chat/robo-audio/${roomId}`;
      console.log(`[useRoboAudioPlayer] Connecting to WebSocket at ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("[useRoboAudioPlayer] WebSocket connection opened successfully");
      };

      ws.onclose = (event) => {
        console.log(`[useRoboAudioPlayer] WebSocket connection closed: code=${event.code}, reason=${event.reason}`);
      };

      ws.onerror = (error) => {
        console.error("[useRoboAudioPlayer] WebSocket error:", error);
      };

      ws.onmessage = async (evt) => {
        console.log(`[useRoboAudioPlayer] Received WebSocket message: type=${typeof evt.data}, length=${evt.data?.length || 'unknown'}`);
        
        try {
          const data = JSON.parse(evt.data);
          console.log(`[useRoboAudioPlayer] Parsed message type: ${data.type}`);
          
          if (data.type !== "roboPcmBase64") {
            console.log(`[useRoboAudioPlayer] Ignoring non-audio message type: ${data.type}`);
            return;
          }
          
          if (!audioContextRef.current) {
            console.error("[useRoboAudioPlayer] AudioContext is null, cannot play audio");
            return;
          }

          console.log(`[useRoboAudioPlayer] Processing PCM data, base64 length: ${data.pcmBase64.length}`);
          
          try {
            // Convert base64 to binary
            const pcmBinary = Uint8Array.from(atob(data.pcmBase64), (c) => c.charCodeAt(0));
            console.log(`[useRoboAudioPlayer] Decoded PCM binary length: ${pcmBinary.length} bytes`);
            
            // Create WAV header - assuming 16-bit PCM, 48kHz, mono
            const sampleRate = 48000;
            const numChannels = 1;
            const bitsPerSample = 16;
            
            // Create WAV header
            const wavHeader = new ArrayBuffer(44);
            const view = new DataView(wavHeader);
            
            // "RIFF" chunk descriptor
            view.setUint8(0, "R".charCodeAt(0));
            view.setUint8(1, "I".charCodeAt(0));
            view.setUint8(2, "F".charCodeAt(0));
            view.setUint8(3, "F".charCodeAt(0));
            
            // File size (36 + data size)
            view.setUint32(4, 36 + pcmBinary.length, true);
            
            // "WAVE" format
            view.setUint8(8, "W".charCodeAt(0));
            view.setUint8(9, "A".charCodeAt(0));
            view.setUint8(10, "V".charCodeAt(0));
            view.setUint8(11, "E".charCodeAt(0));
            
            // "fmt " sub-chunk
            view.setUint8(12, "f".charCodeAt(0));
            view.setUint8(13, "m".charCodeAt(0));
            view.setUint8(14, "t".charCodeAt(0));
            view.setUint8(15, " ".charCodeAt(0));
            
            // Sub-chunk size (16 for PCM)
            view.setUint32(16, 16, true);
            
            // Audio format (1 for PCM)
            view.setUint16(20, 1, true);
            
            // Number of channels
            view.setUint16(22, numChannels, true);
            
            // Sample rate
            view.setUint32(24, sampleRate, true);
            
            // Byte rate
            view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
            
            // Block align
            view.setUint16(32, numChannels * (bitsPerSample / 8), true);
            
            // Bits per sample
            view.setUint16(34, bitsPerSample, true);
            
            // "data" sub-chunk
            view.setUint8(36, "d".charCodeAt(0));
            view.setUint8(37, "a".charCodeAt(0));
            view.setUint8(38, "t".charCodeAt(0));
            view.setUint8(39, "a".charCodeAt(0));
            
            // Data size
            view.setUint32(40, pcmBinary.length, true);
            
            // Combine header and PCM data
            const wavData = new Uint8Array(wavHeader.byteLength + pcmBinary.length);
            wavData.set(new Uint8Array(wavHeader), 0);
            wavData.set(pcmBinary, wavHeader.byteLength);
            
            console.log(`[useRoboAudioPlayer] Created WAV data with header, total length: ${wavData.length} bytes`);
            
            // Try decoding the WAV data
            const audioBuffer = await audioContextRef.current.decodeAudioData(
              wavData.buffer
            );

            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            
            source.onended = () => {
              console.log("[useRoboAudioPlayer] Audio playback completed");
            };
            
            source.start();
            console.log("[useRoboAudioPlayer] Audio playback started");
          } catch (decodeErr) {
            console.error("[useRoboAudioPlayer] Error decoding audio data:", decodeErr);
          }
        } catch (err) {
          console.error("[useRoboAudioPlayer] Error processing WebSocket message:", err);
        }
      };

      return () => {
        console.log("[useRoboAudioPlayer] Cleaning up WebSocket and AudioContext");
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
    } catch (err) {
      console.error("[useRoboAudioPlayer] Setup error:", err);
      return () => {};
    }
  }, [isRoboMode, roomId]);
}
