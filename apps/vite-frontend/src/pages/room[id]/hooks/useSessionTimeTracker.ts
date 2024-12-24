// hooks/useSessionTimeTracker.ts

import { useEffect, useRef, useState } from 'react';

interface SessionTimeTrackerOptions {
  roomId: string;
  hashedTeacherAddress?: string;
  hashedLearnerAddress?: string;
  role?: string | null;
}

/**
 * Connects to the session-time-tracker Worker / DO system over WebSocket,
 * calls /init once connected, and listens for broadcast messages (including finalization).
 */
export function useSessionTimeTracker(options: SessionTimeTrackerOptions) {
  const { roomId, hashedTeacherAddress, hashedLearnerAddress, role } = options;

  const [hasConnectedWs, setHasConnectedWs] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);

  // Keep a ref to the WebSocket so we can close on unmount if needed
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    // For example, if your Worker is at wss://example.com/connect/...
    // or from an ENV variable. Adjust to your actual endpoint.
    const ws = new WebSocket(`wss://your-domain.com/connect/${roomId}`);
    wsRef.current = ws;

    ws.onopen = async () => {
      setHasConnectedWs(true);
      // Once open, call /init
      try {
        const initResponse = await fetch('https://your-domain.com/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Send whatever your DO needs
            clientSideRoomId: roomId,
            hashedTeacherAddress,
            hashedLearnerAddress,
            userAddress: '0xSomeUserAddress', // or whichever address you have
            sessionDuration: 3600, // in seconds? or ms?
            controllerAddress: '0xYourControllerAddress',
          }),
        });
        if (!initResponse.ok) {
          console.error('session-time-tracker init failed');
        }
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
  }, [roomId, hashedTeacherAddress, hashedLearnerAddress, role]);

  return {
    hasConnectedWs,
    initializationComplete,
    messages,
    isFinalized,
  };
}

