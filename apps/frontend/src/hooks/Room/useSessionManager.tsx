import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';

const useSessionManager = ({
  clientSideRoomId,
  hashedTeacherAddress,
  hashedLearnerAddress,
  userAddress,
}: UseSessionManagerOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const signerRef = useRef<ethers.Signer | null>(null);

  useEffect(() => {
    const privateKey = "0x";
    const signer = new ethers.Wallet(privateKey);
    signerRef.current = signer;

    const initializeWebhookServer = async () => {
      try {
        const workerUrl = import.meta.env.VITE_SESSION_TIMER_WORKER_URL;
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
            const websocketUrl = `wss://${workerUrl}/websocket/${clientSideRoomId}`;
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
              const message = event.data;
              setMessages((prevMessages) => [
                ...prevMessages,
                { type: 'message', data: message },
              ]);
            });

            socket.addEventListener('error', (error) => {
              console.error('WebSocket error:', error);
              setMessages((prevMessages) => [
                ...prevMessages,
                { type: 'websocket', data: `WebSocket error: ${error}` },
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

    initializeWebhookServer();

    return () => {
      stopHeartbeat();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [clientSideRoomId, hashedTeacherAddress, hashedLearnerAddress, userAddress]);

  const startHeartbeat = () => {
    if (heartbeatTimerRef.current) return;

    heartbeatTimerRef.current = setInterval(async () => {
      if (!socketRef.current || !signerRef.current) return;

      const timestamp = Date.now();
      const message = `Heartbeat at ${timestamp}`;
      const signature = await signerRef.current.signMessage(message);
      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp,
        signature,
      };
      socketRef.current.send(JSON.stringify(heartbeatMessage));
    }, 30000);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  return messages;
};

interface Message {
  type: 'init' | 'websocket' | 'message';
  data: any;
}

interface UseSessionManagerOptions {
  clientSideRoomId: string;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  userAddress: string;
}

export default useSessionManager;
