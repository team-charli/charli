import { useState, useEffect } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useSupabase } from '../../contexts/SupabaseContext';

const useSessionCases = (messages: Message[]) => {
  const [sessionIPFSData, setSessionIPFSData] = useState<SessionIPFSData | null>(null);
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');
  const { client: supabaseClient, supabaseLoading } = useSupabase();

  useEffect(() => {
    const handleMessage = async (message: Message) => {
      if (message.type === 'message') {
        const parsedData = JSON.parse(message.data);
        if (parsedData.type === 'userData') {
          const signedData = await signTimestampData(parsedData.data);
          const ipfsHash = await postDataToIPFS(signedData);
          await postDataToSupabase(ipfsHash, parsedData.data);
          setSessionIPFSData(signedData);
        }
      }
    };

    messages.forEach((message) => {
      handleMessage(message);
    });
  }, [messages]);

  const signTimestampData = async (sessionData: SessionData): Promise<SessionIPFSData> => {
    if (currentAccount && sessionSigs) {
      try {
        const pkpWallet = new PKPEthersWallet({
          controllerSessionSigs: sessionSigs,
          pkpPubKey: currentAccount.publicKey,
        });
        await pkpWallet.init();

        const signature = await pkpWallet.signMessage(JSON.stringify(sessionData));

        const signedData: SessionIPFSData = {
          ...sessionData,
          signedClientTimestamp: signature,
        };

        return signedData;
      } catch (error) {
        console.error(error);
        throw new Error('Error signing timestamp data');
      }
    }

    throw new Error('currentAccount or sessionSigs missing');
  };

  const postDataToIPFS = async (signedData: SessionIPFSData): Promise<string> => {
    try {
      const apiKey = import.meta.env.VITE_PINATA_API_KEY;
      const apiSecret = import.meta.env.VITE_PINATA_API_SECRET;

      const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
      const headers = {
        'Content-Type': 'application/json',
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          pinataContent: signedData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.IpfsHash;
      } else {
        throw new Error('Failed to post data to IPFS');
      }
    } catch (error) {
      console.error(error);
      throw new Error('Error posting data to IPFS');
    }
  };

  const postDataToSupabase = async (ipfsHash: string, sessionData: SessionData): Promise<void> => {
    try {
      if (supabaseClient && !supabaseLoading) {
        const { data, error } = await supabaseClient
          .from('sessions')
          .update({ ipfs_cid: ipfsHash })
          .eq('huddle_room_id', sessionData.teacher?.roomId || sessionData.learner?.roomId);

        if (error) {
          throw new Error('Failed to update session data in Supabase');
        } else {
          console.log('Session data updated in Supabase:', data);
        }
      } else {
        throw new Error('Supabase client not initialized');
      }
    } catch (error) {
      console.error(error);
      throw new Error('Error posting data to Supabase');
    }
  };

  return sessionIPFSData;
};

interface SessionData {
  teacher: User | null;
  learner: User | null;
}

interface SessionIPFSData extends SessionData {
  signedClientTimestamp: string;
}

interface User {
  role: "teacher" | "learner" | null;
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  joinedAtSig: string | null;
  leftAtSig: string | null;
  faultTime?: number;
  faultTimeSig?: string;
  duration: number | null;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
}

interface Message {
  type: 'init' | 'websocket' | 'message';
  data: any;
}

export default useSessionCases;
