// hooks/useSessionTimeTracker.ts
import { useLitAccount } from '@/contexts/AuthContext';
import { useEffect, useRef, useState } from 'react';

/**
 * Connects to the session-time-tracker Worker/DO system over WebSocket,
 * calls /init once connected, and listens for broadcast messages (including finalization).
 */
export function useSessionTimeTracker(
  roomId: string,
  hashedLearnerAddress: string,
  hashedTeacherAddress: string,
  controllerAddress: string
) {
  const [hasConnectedWs, setHasConnectedWs] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const { data: currentAccount } = useLitAccount();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId || !hashedLearnerAddress || !hashedTeacherAddress || !controllerAddress) {
      console.error(
        '[useSessionTimeTracker] Missing required params:',
        { roomId, hashedLearnerAddress, hashedTeacherAddress, controllerAddress }
      );
      return;
    }

    // Open the WebSocket
    const ws = new WebSocket(`wss://session-time-tracker.charli.chat/connect/${roomId}`);
    wsRef.current = ws;

    /**
     * onopen
     */
    ws.onopen = async () => {
      console.log(`[WebSocket] onopen → Connected (roomId=${roomId})`);
      setHasConnectedWs(true);

      // Once connected, call /init
      try {
        console.log(`[WebSocket] → POST /init for room: ${roomId}`);
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
          console.error(`[WebSocket] /init failed (roomId=${roomId})`);
        } else {
          console.log(`[WebSocket] /init succeeded (roomId=${roomId})`);
        }
      } catch (err) {
        console.error('[WebSocket] onopen → Failed to call /init:', err);
      }
    };

    /**
     * onmessage
     */
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, data: payload } = data;

        // Keep track of all incoming messages
        setMessages((prev) => [...prev, data]);

        // Structured logging for every recognized message type
        switch (type) {
          case 'initiated':
            console.group(`[WebSocket] "initiated" (roomId=${roomId})`);
            console.log('Data payload:', payload);
            console.groupEnd();

            // 'initiated' → Session confirmed to have started
            setInitializationComplete(true);
            break;

          case 'warning':
            console.group(`[WebSocket] "warning" (roomId=${roomId})`);
            console.log('3-minute warning before session ends.');
            console.log('Data payload:', payload);
            console.groupEnd();
            break;

          case 'expired':
            console.group(`[WebSocket] "expired" (roomId=${roomId})`);
            console.log('Session duration fully elapsed (non-fault).');
            console.log('Data payload:', payload);
            console.groupEnd();
            break;

          case 'fault':
            console.group(`[WebSocket] "fault" (roomId=${roomId})`);
            console.error('SessionTimer indicated a fault scenario (e.g. second user never joined).');
            console.log('Data payload:', payload);
            console.groupEnd();
            break;

          case 'userJoined':
            console.group(`[WebSocket] "userJoined" (roomId=${roomId})`);
            console.log('A user joined the session.');
            console.log('Data payload:', payload);
            console.groupEnd();
            break;

          case 'userLeft':
            console.group(`[WebSocket] "userLeft" (roomId=${roomId})`);
            console.log('A user left the session.');
            console.log('Data payload:', payload);
            console.groupEnd();
            break;

          case 'bothJoined':
            console.group(`[WebSocket] "bothJoined" (roomId=${roomId})`);
            console.log('Both teacher and learner are now present.');
            console.log('Data payload:', payload);
            console.groupEnd();
            break;

          case 'finalized':
            console.group(`[WebSocket] "finalized" (roomId=${roomId})`);
            console.log('The session was finalized (either success or fault).');
            console.log('Data payload:', payload);
            console.groupEnd();

            setIsFinalized(true);
            break;

          default:
            // Catch any unrecognized message types
            console.group(`[WebSocket] Unknown message type: ${type} (roomId=${roomId})`);
            console.log('Raw event data:', data);
            console.groupEnd();
            break;
        }
      } catch (err) {
        console.error('[WebSocket] onmessage → Error parsing JSON:', err);
      }
    };

    /**
     * onerror
     */
    ws.onerror = (err) => {
      console.error('[WebSocket] onerror:', err);
    };

    /**
     * onclose
     */
    ws.onclose = (event) => {
      console.warn(`[WebSocket] onclose → Connection closed (roomId=${roomId})`, event);
      setHasConnectedWs(false);
      wsRef.current = null;
    };

    return () => {
      console.log(`[WebSocket] Cleanup → Closing on unmount (roomId=${roomId})`);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [
    roomId,
    hashedLearnerAddress,
    hashedTeacherAddress,
    controllerAddress,
    currentAccount?.ethAddress,
  ]);

  return {
    hasConnectedWs,
    initializationComplete,
    messages,
    isFinalized,
  };
}
