// useSessionManager.tsx
import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Message, UseSessionManagerOptions } from '@/types/types';
import { usePkpWallet } from '@/contexts/AuthContext';

const useSessionManager = ({
  clientSideRoomId,
  hashedTeacherAddress,
  hashedLearnerAddress,
  userAddress,
  currentAccount,
  sessionSigs
}: UseSessionManagerOptions) => {
  const { data: pkpWallet } = usePkpWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (heartbeatTimerRef.current) return;

    heartbeatTimerRef.current = setInterval(() => {
      if (!socketRef.current || !sessionSigs || !currentAccount || !pkpWallet) return;

      const timestamp = Date.now();
      const message = `Heartbeat at ${timestamp}`;

      signMessageMutation.mutate(message, {
        onSuccess: (signature) => {
          const heartbeatMessage = {
            type: 'heartbeat',
            timestamp,
            signature,
          };
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

  useEffect(() => {
    if (clientSideRoomId && hashedTeacherAddress && hashedLearnerAddress && userAddress && currentAccount && sessionSigs && pkpWallet) {
      const initializeWebhookServer = async () => {
        try {
          const workerUrl = import.meta.env.VITE_SESSION_TIMER_WORKER_URL;
          if (!workerUrl) throw new Error('undefined env');
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

          if (response.ok) {
            setMessages((prevMessages) => [
              ...prevMessages,
              { type: 'init', data: 'Initialization successful' },
            ]);

            const connectWebSocket = () => {
              const websocketUrl = `wss://${workerUrl.replace('https://', '')}/websocket/${clientSideRoomId}`;
              const socket = new WebSocket(websocketUrl);
              socketRef.current = socket;

              socket.addEventListener('open', () => {
                console.log('WebSocket connection established');
                startHeartbeat();
              });

              socket.addEventListener('close', () => {
                console.log('WebSocket connection closed');
                stopHeartbeat();
              });

              socket.addEventListener('message', (event) => {
                const message = JSON.parse(event.data);
                setMessages((prevMessages) => [
                  ...prevMessages,
                  { type: 'message', data: message },
                ]);
              });

              socket.addEventListener('error', (error) => {
                console.error('WebSocket error:', error);
                setMessages((prevMessages) => [
                  ...prevMessages,
                  { type: 'websocket', data: 'WebSocket error: ' + String(error) },
                ]);
              });
            };

            connectWebSocket();
          } else {
            setMessages((prevMessages) => [
              ...prevMessages,
              { type: 'init', data: 'Initialization failed' },
            ]);
          }
        } catch (error) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { type: 'init', data: `Initialization error: ${error}` },
          ]);
        }
      };

      void initializeWebhookServer();

      return () => {
        stopHeartbeat();
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    }
  }, [clientSideRoomId, hashedTeacherAddress, hashedLearnerAddress, userAddress, currentAccount, sessionSigs, pkpWallet]);

  return messages;
};

export default useSessionManager;
