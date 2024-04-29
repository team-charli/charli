import { useState, useEffect, useRef } from 'react';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { Message, UseSessionManagerOptions } from '@/types/types';

const useSessionManager = ({
  clientSideRoomId,
  hashedTeacherAddress,
  hashedLearnerAddress,
  userAddress,
  currentAccount,
  sessionSigs
}: UseSessionManagerOptions) => {
  const startHeartbeat = () => {
  if (heartbeatTimerRef.current) return;

  heartbeatTimerRef.current = setInterval(() => {
    if (!socketRef.current || !sessionSigs || !currentAccount) return;

    const pkpWallet = new PKPEthersWallet({
      controllerSessionSigs: sessionSigs,
      pkpPubKey: currentAccount.publicKey,
    });

    let timestamp: number;
    pkpWallet.init()
      .then(() => {
         timestamp = Date.now();
        const message = `Heartbeat at ${timestamp}`;

        return pkpWallet.signMessage(message);
      })
      .then((signature) => {
        const heartbeatMessage = {
          type: 'heartbeat',
          timestamp,
          signature,
        };

        socketRef.current?.send(JSON.stringify(heartbeatMessage));
      })
      .catch((error) => {
        console.error('Error in heartbeat:', error);
      });
  }, 30000);
};

  const stopHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (clientSideRoomId && hashedTeacherAddress && hashedLearnerAddress && userAddress && currentAccount && sessionSigs) {
      const initializeWebhookServer = async () => {
        try {
          const workerUrl = process.env.NEXT_PUBLIC_SESSION_TIMER_WORKER_URL;
          if (!workerUrl) throw new Error('undfined env')
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

      void (async () => {
        await initializeWebhookServer();
      })();

      return () => {
        stopHeartbeat();
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSideRoomId, hashedTeacherAddress, hashedLearnerAddress, userAddress, currentAccount, sessionSigs]);


  return messages;
};


export default useSessionManager;
