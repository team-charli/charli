import ky from 'ky';
import ethers from 'ethers';
import { useState, useEffect } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { checkSessionCompleted } from '../../utils/app';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { TimestampResponse } from '../../types/types';
import { useStoreRoomLeftData } from '../Supabase/DbCalls/useStoreRoomLeftData';

export const useSessionTimer = (roomRole: string, sessionData: any) => {
  const [timerWebsocket, setTimerWebsocket] = useState<WebSocket | null>(null);
  const [bothWsConnected, setBothWsConnected] = useState(false);
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs')
  const [timerInitiated, setTimerInitiated] = useState(false);
  const [ initTimestamp, setInitTimestamp ] = useState('');
  const [ initTimestampSig, setInitTimestampSig] = useState('');
  const [ timerExpired, setTimerExpired] = useState(false);
  const [ expiredTimestamp, setExpiredTimestamp] = useState('');
  const [ expiredTimestampSig, setExpiredTimestampSig ] = useState('');
  const { storeRoomLeftData } = useStoreRoomLeftData()

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
      //NOTE: put Faultcases from Server below
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

// storeRoomLeftData on timerExpired
  useEffect(() => {
    (async () => {
      if (timerExpired && sessionSigs && currentAccount && sessionData.session_id){
        const session_id = sessionData.session_id;
        const pkpWallet = new PKPEthersWallet({controllerSessionSigs: sessionSigs, pkpPubKey: currentAccount.publicKey});
        await pkpWallet.init();
        const timestampRes = await ky.get('https://sign-timestamp.zach-greco.workers.dev').json<TimestampResponse>();
        const {timestamp: leftTimestamp, signature: leftTimestampWorkerSig} = timestampRes
        const sigRes = await pkpWallet.signMessage(leftTimestamp + roomRole);
        await storeRoomLeftData(leftTimestamp, sigRes, roomRole, leftTimestampWorkerSig, session_id)
      }
    })();

  }, [ timerExpired, sessionData.session_id, currentAccount, sessionSigs ])


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

