// useSessionManager.tsx
import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Message, UseSessionManagerOptions } from '@/types/types';
import { useLitAccount, usePkpWallet, useSessionSigs } from '@/contexts/AuthContext';

const useSessionManager = ({
  clientSideRoomId,
  hashedTeacherAddress,
  hashedLearnerAddress,
}: UseSessionManagerOptions) => {
  console.log('run useSessionManager');

  const { data: sessionSigs } = useSessionSigs();
  const { data: pkpWallet } = usePkpWallet();
  const { data: currentAccount } = useLitAccount();
  const userAddress = currentAccount?.ethAddress;
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasConnectedWs, setHasConnectedWs] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);

  const signMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!pkpWallet) throw new Error('pkpWallet is undefined');
      return await pkpWallet.signMessage(message);
    },
    retry: 3,
    retryDelay: (attemptIndex) => 1000 * 2 ** attemptIndex,
    onError: (error) => {
      console.error("Error signing message:", error);
    }
  });

  const startHeartbeat = () => {
    if (heartbeatTimerRef.current !== null) return;

    heartbeatTimerRef.current = window.setInterval(() => {
      if (!socketRef.current || !sessionSigs || !currentAccount || !pkpWallet) return;

      const timestamp = Date.now();
      console.log('Sending heartbeat:', timestamp);
      const message = `Heartbeat at ${timestamp}`;

      signMessageMutation.mutate(message, {
        onSuccess: (signature) => {
          const heartbeatMessage = {
            type: 'heartbeat',
            timestamp,
            signature,
          };
          console.log('Sending heartbeat message:', heartbeatMessage);
          socketRef.current?.send(JSON.stringify(heartbeatMessage));
        },
        onError: (error) => {
          console.error('Error in heartbeat:', error);
        }
      });
    }, 30000);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  const connectWebSocket = (role: string, roomId: string, workerUrl: string) => {
    console.log('Attempting to connect WebSocket');

    // Fix URL construction for both dev and prod
    const wsUrl = workerUrl.startsWith('http://')
      ? `ws://${workerUrl.replace('http://', '')}`  // Dev environment
      : `wss://${workerUrl.replace('https://', '')}`; // Prod environment

    const websocketUrl = `${wsUrl}/websocket/${roomId}`;
    console.log('WebSocket URL:', websocketUrl);

    const socket = new WebSocket(websocketUrl);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      console.log('WebSocket connection opened');
      setHasConnectedWs(true);
      const initMessage = {
        type: 'initConnection',
        data: { role, roomId }
      };
      console.log('Sending init message:', JSON.stringify(initMessage));
      socket.send(JSON.stringify(initMessage));
    });

    socket.addEventListener('message', (event) => {
      console.log('WebSocket message received:', event.data);
      const message = JSON.parse(event.data);
      if (message.type === 'connectionConfirmed') {
        console.log('WebSocket connection confirmed, starting heartbeat');
        startHeartbeat();
      }
      console.log('Processed message type:', message.type, 'data:', message.data);
      console.log('Current messages state before update:', messages);
      setMessages((prevMessages) => {
        const newMessages = [
          ...prevMessages,
          { type: "message" as const, data: message }  // Explicitly type as Message
        ];
        console.log('Updated messages state:', newMessages);
        return newMessages;
      });
    });

    socket.addEventListener('close', (event) => {
      console.log('WebSocket connection closed', event.code, event.reason);
      stopHeartbeat();
    });

    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: 'websocket', data: 'WebSocket error: ' + String(error) },
      ]);
    });
  };

  useEffect(() => {
    console.log('useEffect triggered in useSessionManager', {
      clientSideRoomId,
      hashedTeacherAddress,
      hashedLearnerAddress,
      userAddress,
      currentAccount: currentAccount ? 'defined' : 'undefined',
      sessionSigs: sessionSigs ? 'defined' : 'undefined',
      pkpWallet: pkpWallet ? 'defined' : 'undefined',
    });

    if (
      clientSideRoomId &&
        hashedTeacherAddress &&
        hashedLearnerAddress &&
        userAddress &&
        currentAccount &&
        sessionSigs &&
        pkpWallet
    ) {
      const initializeWebhookServer = async () => {
        try {
          // const workerUrl = import.meta.env.VITE_SESSION_TIMER_WORKER_URL_DEV;
          const workerUrl = import.meta.env.VITE_SESSION_TIMER_WORKER_URL;

          if (!workerUrl) throw new Error('VITE_SESSION_TIMER_WORKER_URL is undefined');

          const response = await fetch(`${workerUrl}/init`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientSideRoomId,
              hashedTeacherAddress,
              hashedLearnerAddress,
              userAddress,
            }),
          });

          console.log('Init response received', response.status, response.statusText);

          if (response.ok) {
            try {
              const initData = await response.json();
              console.log('Parsed init data:', initData);

              setMessages((prevMessages) => [
                ...prevMessages,
                {
                  type: 'init',
                  data: `Initialization ${
initData.status === 'OK' ? 'successful' : 'failed'
}. Role: ${initData.role || 'unknown'}`,
                },
              ]);

              if (initData.role && initData.roomId) {
                connectWebSocket(initData.role, initData.roomId, workerUrl);
              } else {
                console.error('Role or roomId not received from initialization', initData);
                setMessages((prevMessages) => [
                  ...prevMessages,
                  {
                    type: 'init',
                    data: 'Initialization failed: Missing role or roomId',
                  },
                ]);
              }
            } catch (error) {
              console.error('Failed to parse response as JSON:', error);
              setMessages((prevMessages) => [
                ...prevMessages,
                {
                  type: 'init',
                  data: 'Initialization failed: Could not parse server response',
                },
              ]);
            }
          } else {
            const errorText = await response.text();
            console.error('Init failed', errorText);
            setMessages((prevMessages) => [
              ...prevMessages,
              { type: 'init', data: `Initialization failed: ${errorText}` },
            ]);
          }
        } catch (error) {
          console.error('Error in initializeWebhookServer:', error);
          setMessages((prevMessages) => [
            ...prevMessages,
            { type: 'init', data: `Initialization error: ${error.message}` },
          ]);
        }
      };

      void initializeWebhookServer();

      return () => {
        console.log('Cleanup function called');
        stopHeartbeat();
        if (socketRef.current) {
          console.log('Closing WebSocket connection');
          socketRef.current.close();
        }
      };
    } else {
      console.log('Some conditions not met, skipping initialization');
    }
  }, [
      clientSideRoomId,
      hashedTeacherAddress,
      hashedLearnerAddress,
      userAddress,
      currentAccount,
      sessionSigs,
      pkpWallet,
    ]);

  return {messages, hasConnectedWs};
};

export default useSessionManager;
