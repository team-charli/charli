// apps/vite-frontend/src/pages/room[id]/hooks/useRoboAudioPlayer.tsx

import { useEffect, useRef } from "react";

export function useRoboAudioPlayer(roomId: string) {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (import.meta.env.VITE_ROBO_MODE !== "true") return;

    const audioCtx = new AudioContext();
    audioContextRef.current = audioCtx;

    const ws = new WebSocket(`wss://learner-assessment-worker.charli.chat/robo-audio/${roomId}`);
    ws.binaryType = "arraybuffer";

    ws.onmessage = async (evt) => {
      const data = JSON.parse(evt.data);
      if (data.type !== "roboPcmBase64") return;
      if (!audioContextRef.current) return;

      try {
        const pcmBinary = Uint8Array.from(atob(data.pcmBase64), (c) => c.charCodeAt(0));
        const audioBuffer = await audioContextRef.current.decodeAudioData(
          pcmBinary.buffer as ArrayBuffer
        );

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
      } catch (err) {
        console.error("[useRoboAudioPlayer] Error decoding or playing audio:", err);
      }
    };

    return () => {
      ws.close();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [roomId]);
}
