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
          
          if (data.type !== "roboAudioMp3") {
            console.log(`[useRoboAudioPlayer] Ignoring non-audio message type: ${data.type}`);
            return;
          }
          
          if (!audioContextRef.current) {
            console.error("[useRoboAudioPlayer] AudioContext is null, cannot play audio");
            return;
          }

          console.log(`[useRoboAudioPlayer] Processing MP3 data, base64 length: ${data.mp3Base64.length}`);
          
          try {
            // Convert base64 MP3 to binary
            const mp3Binary = Uint8Array.from(atob(data.mp3Base64), (c) => c.charCodeAt(0));
            console.log(`[useRoboAudioPlayer] Decoded MP3 binary length: ${mp3Binary.length} bytes`);
            
            // Use Web Audio API to decode MP3 directly (much simpler!)
            const audioBuffer = await audioContextRef.current.decodeAudioData(mp3Binary.buffer);

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
