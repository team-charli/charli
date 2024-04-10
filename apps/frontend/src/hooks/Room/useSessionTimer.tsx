import ethers from 'ethers';
import { useState, useEffect } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { checkSessionCompleted } from '../../utils/app';

export const useSessionTimer = (roomRole: string, sessionData: any) => {
  const [timerWebsocket, setTimerWebsocket] = useState<WebSocket | null>(null);
  const [bothWsConnected, setBothWsConnected] = useState(false);
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [timerInitiated, setTimerInitiated] = useState(false);
  const [ initTimestamp, setInitTimestamp ] = useState('');
  const [ initTimestampSig, setInitTimestampSig] = useState('');
  const [ timerExpired, setTimerExpired] = useState(false);
  const [ expiredTimestamp, setExpiredTimestamp] = useState('');
  const [ expiredTimestampSig, setExpiredTimestampSig ] = useState('');


  useEffect(() => {
    if (currentAccount) {
      const workerUrl = import.meta.env.VITE_SESSION_TIMER_WORKER_URL;
      const ws = new WebSocket(workerUrl);
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'connect',
            ethereumAddress: currentAccount.ethAddress,
          })
        );
      };
      setTimerWebsocket(ws);
      ws.onmessage = (event) => {
        const { message } = JSON.parse(event.data);
        if (message.type === 'bothConnected') {
          setBothWsConnected(true);
        } else if (message.type === 'initiated') {
          const { data: {timestampMs, timestampSig} } = JSON.parse(event.data);
          setInitTimestamp(timestampMs);
          setInitTimestampSig(timestampSig);
          setTimerInitiated(true);
        } else if (message.type === 'warning') {
          //send 3 minute warning to chat
        }
        else if (message.type === 'expired') {
          const { data: {timestampMs, timestampSig} } = JSON.parse(event.data);

          setExpiredTimestamp(timestampMs);
          setExpiredTimestampSig(timestampSig);
          setTimerExpired(true);
          // leave room gracefully
          // Call useCallExecuteTransferControllerToTeacher
        }
      };
      return () => {
        ws.close();
      };
    }
  }, [currentAccount, sessionData]);

  const submitSignature = async () => {
    if (currentAccount && sessionData) {
      const response = await fetch(`${import.meta.env.VITE_SESSION_TIMER_WORKER_URL}/submitSignature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashedTeacherAddress: sessionData.hashed_teacher_address,
          hashedLearnerAddress: sessionData.hashed_learner_address,
          teacher_joined_timestamp: sessionData.teacher_joined_timestamp,
          teacher_joined_signature: sessionData.teacher_joined_signature,
          teacher_joined_timestamp_worker_sig: sessionData.teacher_joined_timestamp_worker_sig,
          learner_joined_timestamp: sessionData.learner_joined_timestamp,
          learner_joined_signature: sessionData.learner_joined_signature,
          learner_joined_timestamp_worker_sig: sessionData.learner_joined_timestamp_worker_sig,
          workerPublicAddress: import.meta.env.VITE_PUBLIC_ADDRESS_TIMESTAMP_WORKER_WALLET,
          sessionDuration: sessionData.requested_session_duration,
        }),
      });

      if (response.ok) {
        console.log('Signatures submitted successfully');
      } else {
        console.error('Failed to submit signatures');
      }
    }
  };

  return { bothWsConnected, timerWebsocket, submitSignature, timerInitiated, initTimestamp, initTimestampSig, timerExpired, expiredTimestamp, expiredTimestampSig };
};

