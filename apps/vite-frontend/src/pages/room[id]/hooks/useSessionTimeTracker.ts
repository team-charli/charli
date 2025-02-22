// hooks/useSessionTimeTracker.ts

import { useLitAccount } from '@/contexts/AuthContext';
import { useEffect, useRef, useState } from 'react';

/**
 * Connects to the session-time-tracker Worker / DO system over WebSocket,
 * calls /init once connected, and listens for broadcast messages (including finalization).
 */
export function useSessionTimeTracker(roomId: string, hashedLearnerAddress: string, hashedTeacherAddress: string, controllerAddress: string) {

  const [hasConnectedWs, setHasConnectedWs] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const {data: currentAccount} = useLitAccount();
  // Keep a ref to the WebSocket so we can close on unmount if needed
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {

    if (!roomId || !hashedLearnerAddress || !hashedTeacherAddress || !controllerAddress) {

   console.log("{roomId, hashedLearnerAddress, hashedTeacherAddress, controllerAddress}", {roomId, hashedLearnerAddress, hashedTeacherAddress, controllerAddress});
    return;
   }
    const ws = new WebSocket(`wss://session-time-tracker.charli.chat/connect/${roomId}`);
    wsRef.current = ws;

    ws.onopen = async () => {
      setHasConnectedWs(true);
      // Once open, call /init
      try {
        console.log('[TIME] ws.onopen =>', performance.now());
        const initStart = performance.now();

        const initResponse = await fetch('https://session-time-tracker.charli.chat/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientSideRoomId: roomId,
            hashedTeacherAddress,
            hashedLearnerAddress,
            controllerAddress,
            userAddress: currentAccount?.ethAddress,
            sessionDuration: 3600,
          }),
        });
        if (!initResponse.ok) {
          console.error('session-time-tracker init failed');
        }
        console.log('[TIME] /init response =>', performance.now() - initStart, 'ms');
      } catch (err) {
        console.error('Failed to call /init:', err);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);

        switch (data.type) {
          case 'initiated':
            // Means the Worker has confirmed the session is initiated
            console.log('[TIME] "initiated" message =>', performance.now());
            setInitializationComplete(true);
            break;
          case 'finalized':
            // Means the Worker has broadcast a finalization
            setIsFinalized(true);
            break;
          default:
            // you can handle other message types here
            break;
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    ws.onclose = () => {
      // handle close
      setHasConnectedWs(false);
      wsRef.current = null;
    };

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomId, hashedTeacherAddress, hashedLearnerAddress, controllerAddress]);

  return {
    hasConnectedWs,
    initializationComplete,
    messages,
    isFinalized,
  };
}

