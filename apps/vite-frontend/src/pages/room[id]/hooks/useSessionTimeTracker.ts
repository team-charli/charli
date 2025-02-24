// hooks/useSessionTimeTracker.ts
import { useLitAccount } from '@/contexts/AuthContext';
import { useEffect, useRef, useState } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { useSessionsContext } from '@/contexts/SessionsContext';
import { SessionsContextType, ExtendedSession } from '@/types/types';

/**
 * Connects to the session-time-tracker Worker/DO system over WebSocket,
 * calls /init once connected (if not already done), and listens for broadcast messages.
 * Also checks if the session is expired from the SessionsContext.
 */
export function useSessionTimeTracker(
  roomId: string,
  hashedLearnerAddress: string,
  hashedTeacherAddress: string,
  controllerAddress: string
) {
  // Access session data from context
  const { sessionsContextValue } = useSessionsContext() as SessionsContextType;

  const [hasConnectedWs, setHasConnectedWs] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);

  const { data: currentAccount } = useLitAccount();
  const wsRef = useRef<WebSocket | null>(null);

  /**
   * Because you're only dealing with ONE active session at a time,
   * we can store a simple, fixed key like "session-init" (instead of using roomId).
   */
  const [sessionInitialized, setSessionInitialized, removeSessionInitialized] =
    useLocalStorage<boolean>('session-init', false);

  useEffect(() => {
    // 1. Basic input validation
    if (!roomId || !hashedLearnerAddress || !hashedTeacherAddress || !controllerAddress) {
      console.error('[useSessionTimeTracker] Missing required params:', {
        roomId,
        hashedLearnerAddress,
        hashedTeacherAddress,
        controllerAddress,
      });
      return;
    }

    // 2. Set up the WebSocket
    const ws = new WebSocket(`wss://session-time-tracker.charli.chat/connect/${roomId}`);
    wsRef.current = ws;

    /**
     * onopen
     */
    ws.onopen = async () => {
      console.log(`[WebSocket] onopen → Connected (roomId=${roomId})`);
      setHasConnectedWs(true);

      // Only call /init if we haven't already done so in this browser session
      if (!sessionInitialized) {
        console.log(`[WebSocket] → Attempting /init for room: ${roomId}`);
        try {
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
            // If DO says “Already initiated” or “No WebSocket connection,” log it but don't crash
            const errorText = await initResponse.text();
            console.error('[WebSocket] /init failed or already done:', errorText);
          } else {
            console.log(`[WebSocket] /init succeeded (roomId=${roomId})`);
            // Mark that we’ve now done the session init
            setSessionInitialized(true);
          }
        } catch (err) {
          console.error('[WebSocket] onopen → Failed to call /init:', err);
        }
      } else {
        console.log(`[WebSocket] /init skipped → Already initialized (roomId=${roomId})`);
      }
    };

    /**
     * onmessage
     */
    ws.onmessage = (event) => {
      try {
        const parsedMsg = JSON.parse(event.data);
        const { type, data: payload } = parsedMsg;

        // Keep track of all messages in state
        setMessages((prev) => [...prev, parsedMsg]);

        switch (type) {
          case 'initiated':
            console.group(`[WebSocket] "initiated" (roomId=${roomId})`);
            console.log('Data payload:', payload);
            console.groupEnd();
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

            // Mark ourselves finalized and remove local storage
            // so a new session can be started next time
            setIsFinalized(true);
            removeSessionInitialized();
            break;

          case 'fault':
            console.group(`[WebSocket] "fault" (roomId=${roomId})`);
            console.error('A fault scenario occurred (e.g. second user never joined).');
            console.log('Data payload:', payload);
            console.groupEnd();
            break;

          case 'userJoined':
            console.group(`[WebSocket] "userJoined" (roomId=${roomId})`);
            console.log('Another user joined the session.');
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
            console.log('The session was finalized (success or fault).');
            console.log('Data payload:', payload);
            console.groupEnd();

            setIsFinalized(true);

            // Clear the "session-init" key so we can do a fresh session next time
            removeSessionInitialized();
            break;

          default:
            console.group(`[WebSocket] Unknown message type: ${type} (roomId=${roomId})`);
            console.log('Raw event data:', parsedMsg);
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
    sessionInitialized,      // crucial so that we check this inside onopen
    setSessionInitialized,   // needed so we can update localStorage from inside
    removeSessionInitialized // if session finalizes
  ]);

  /**
   * 3. Also listen to the SessionsContext for a possible isExpired flag
   *    on the current session. If found, finalize locally.
   */
  useEffect(() => {
    // If there's only one active session, find it and check if it's expired
    const activeSession = sessionsContextValue.find(
      (s: ExtendedSession) => s.huddle_room_id === roomId
    );
    if (activeSession?.isExpired && !isFinalized) {
      console.log(
        `[SessionsContext] session_id=${activeSession.session_id} isExpired=true. Clearing local init.`
      );
      setIsFinalized(true);
      removeSessionInitialized();
    }
  }, [sessionsContextValue, roomId, isFinalized, removeSessionInitialized]);

  return {
    hasConnectedWs,
    initializationComplete,
    messages,
    isFinalized,
  };
}
