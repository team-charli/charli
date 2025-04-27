///Users/zm/Projects/charli/apps/vite-frontend/src/pages/room[id]/hooks/useRoboAudioPlayer.tsx
import { useEffect } from "react";

export function useRoboAudioPlayer(roomId: string) {
	useEffect(() => {
		if (import.meta.env.VITE_ROBO_MODE !== "true") return;

		const ws = new WebSocket(`wss://learner-assessment-worker.charli.chat/robo-audio/${roomId}`);
		ws.binaryType = "arraybuffer";

		ws.onmessage = async (evt) => {
			const data = JSON.parse(evt.data);
			if (data.type !== "roboPcmBase64") return;

			const audioCtx = new AudioContext();

			const pcmBinary = Uint8Array.from(atob(data.pcmBase64), (c) => c.charCodeAt(0));
			const audioBuffer = await audioCtx.decodeAudioData(
				new Uint8Array(pcmBinary).buffer as ArrayBuffer
			);

			const source = audioCtx.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(audioCtx.destination);
			source.start();
			source.onended = () => audioCtx.close();
		};

		return () => ws.close();
	}, [roomId]);
}
