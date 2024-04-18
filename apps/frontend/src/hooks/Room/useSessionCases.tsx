import { useState, useEffect } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { useSupabase } from '../../contexts/SupabaseContext';

const useSessionCases = (messages: Message[]) => {
  const [userIPFSData, setUserIPFSData] = useState<UserIPFSData | undefined>();
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs')
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  useEffect(() => {
    const handleMessage = async (message: Message) => {
      if (message.type === 'message') {
        const parsedData = JSON.parse(message.data);
        if (parsedData.type === 'fault') {
          const { faultType, user, timestamp, signature } = parsedData.data;
          const sessionCase: SessionCase = {
            type: 'fault',
            faultType,
            user,
            timestamp,
            signature,
          };
          await handleFaultCase(sessionCase);
        } else if (parsedData.type === 'userJoined') {
          const { user, timestamp } = parsedData.data;
          const sessionCase: SessionCase = {
            type: 'userJoined',
            user,
            timestamp,
          };
          await handleUserJoinedCase(sessionCase);
        } else if (parsedData.type === 'userLeft') {
          const { user, timestamp } = parsedData.data;
          const sessionCase: SessionCase = {
            type: 'userLeft',
            user,
            timestamp,
          };
          await handleUserLeftCase(sessionCase);
        }
      }
    };
    messages.forEach((message) => {
      handleMessage(message);
    });
  }, [messages]);

  const handleFaultCase = async (sessionCase: SessionCase) => {
    const signedData = await signTimestampData(sessionCase);
    const ipfsHash = await postDataToIPFS(signedData);
    await postDataToSupabase(ipfsHash, sessionCase);
  };

  const handleUserJoinedCase = async (sessionCase: SessionCase) => {
    const signedData = await signTimestampData(sessionCase);
    const ipfsHash = await postDataToIPFS(signedData);
    await postDataToSupabase(ipfsHash, sessionCase);
  };

  const handleUserLeftCase = async (sessionCase: SessionCase) => {
    const signedData = await signTimestampData(sessionCase);
    const ipfsHash = await postDataToIPFS(signedData);
    await postDataToSupabase(ipfsHash, sessionCase);
  };

  const signTimestampData = async (sessionCase: SessionCase): Promise<SignedData> => {
    if (currentAccount && sessionSigs) {
      try {
        const pkpWallet = new PKPEthersWallet({
          controllerSessionSigs: sessionSigs,
          pkpPubKey: currentAccount.publicKey,
        });
        await pkpWallet.init();

        let message;
        if (sessionCase.type === 'userJoined') {
          message = {
            user: sessionCase.user,
            timestamp: sessionCase.timestamp,
          };
        } else if (sessionCase.type === 'userLeft') {
          message = {
            user: sessionCase.user,
            timestamp: sessionCase.timestamp,
          };
        } else if (sessionCase.type === 'fault') {
          message = {
            user: sessionCase.user,
            faultType: sessionCase.faultType,
            timestamp: sessionCase.timestamp,
          };
        } else {
          throw new Error('Invalid session case type');
        }

        const signature = await pkpWallet.signMessage(JSON.stringify(message));

        const signedData: SignedData = {
          user: sessionCase.user!,
          clientTimestamp: sessionCase.timestamp,
          signedClientTimestamp: signature,
        };

        return signedData;
      } catch (error) {
        console.error(error);
        throw new Error('Error signing timestamp data');
      }
    }

    return {} as SignedData;
  };

  const postDataToIPFS = async (signedData: SignedData): Promise<string> => {
    try {
      const apiKey = import.meta.env.VITE_PINATA_API_KEY;
      const apiSecret = import.meta.env.VITE_PINATA_API_SECRET;

      const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
      const headers = {
        'Content-Type': 'application/json',
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      };

      const mergedData = {
        ...signedData.user,
        clientTimestamp: signedData.clientTimestamp,
        signedClientTimestamp: signedData.signedClientTimestamp,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          pinataContent: mergedData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const ipfsHash = result.IpfsHash;
        setUserIPFSData(mergedData);
        return ipfsHash;
      } else {
        throw new Error('Failed to post data to IPFS');
      }
    } catch (error) {
      console.error(error);
      throw new Error('Error posting data to IPFS');
    }
  };

  const postDataToSupabase = async (ipfsHash: string, sessionCase: SessionCase): Promise<void> => {
    try {
      if (supabaseClient && !supabaseLoading && sessionCase.user) {
        if (sessionCase.user.role === 'teacher') {
          const { data, error } = await supabaseClient
            .from('sessions')
            .update({ ipfs_cid_teacher: ipfsHash })
            .eq('huddle_room_id', sessionCase.user.roomId);

          if (error) {
            throw new Error('Failed to update session data in Supabase');
          } else {
            console.log('Session data updated in Supabase:', data);
          }
        } else if (sessionCase.user.role === 'learner'){
          const { data, error } = await supabaseClient
            .from('sessions')
            .update({ ipfs_cid_learner: ipfsHash })
            .eq('huddle_room_id', sessionCase.user.roomId);
          if (error) {
            throw new Error('Failed to update session data in Supabase');
          } else {
            console.log('Session data updated in Supabase:', data);
          }

        }
      }
      else {
        throw new Error('Supabase client not initialized or user data missing');
      }
    } catch (error) {
      console.error(error);
      throw new Error('Error posting data to Supabase');
    }
  };

  return userIPFSData
};

interface SessionCase {
  type: 'fault' | 'userJoined' | 'userLeft';
  faultType?: 'learnerFault_didnt_join' | 'teacherFault_didnt_join' | 'learnerFault_connection_timeout' | 'teacherFault_connection_timeout';
  user?: User;
  timestamp: number;
  signature?: string;
}

interface SignedData {
  user: User;
  clientTimestamp: number;
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
interface UserIPFSData {
  clientTimestamp: number;
  signedClientTimestamp: string;
  role: "teacher" | "learner" | null;
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  // include other fields as necessary from the User interface
  joinedAtSig?: string | null;
  leftAtSig?: string | null;
  faultTime?: number;
  faultTimeSig?: string;
  duration?: number | null;
  hashedTeacherAddress?: string;
  hashedLearnerAddress: string;
}

export default useSessionCases;
