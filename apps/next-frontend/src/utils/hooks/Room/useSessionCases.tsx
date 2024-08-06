import { useState, useEffect } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { FaultData, Message, SessionData, SessionIPFSData } from '@/types/types';
import { supabaseClientAtom } from '@/atoms/SupabaseClient/supabaseClientAtom';
import { useAtom } from 'jotai';

const useSessionCases = (messages: Message[]) => {
  const [sessionIPFSData, setSessionIPFSData] = useState<SessionIPFSData | null>(null);
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');
  const [{ data: supabaseClient, isLoading: supabaseLoading }] = useAtom(supabaseClientAtom);

  useEffect(() => {
    const handleMessage = async (message: Message) => {
      if (message.type === 'message') {
        const parsedData = JSON.parse(message.data);
        if (parsedData.type === 'userData') {
          const signedData = await signTimestampData(parsedData.data);
          const ipfsHash = await postDataToIPFS(signedData);
          await postDataToSupabase(ipfsHash, parsedData.data);
          setSessionIPFSData(signedData);
        } else if (parsedData.type === 'fault') {
          const { faultType, user, timestamp, signature } = parsedData.data;
          const faultData: FaultData = {
            faultType,
            user,
            faultTime: timestamp,
            faultTimeSig: signature,
          };
          const signedData = await signTimestampData({ ...parsedData.data, fault: faultData });
          const ipfsHash = await postDataToIPFS(signedData);
          await postDataToSupabase(ipfsHash, parsedData.data);
          setSessionIPFSData(signedData);
        }
      }
    };

    void (async (messages) => {
      for (const message of messages) {
        await handleMessage(message);
      }
    })(messages);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          clientTimestamp: Date.now()
        };

        return signedData;
      } catch (error) {
        console.error(error);
        throw new Error('Error signing timestamp data');
      }
    }

    throw new Error('currentAccount or sessionSigs missing');
  };

const postDataToIPFS = (signedData: SessionIPFSData): Promise<string> => {
  const pinata_api_key = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const pinata_secret_api_key = process.env.NEXT_PUBLIC_PINATA_API_SECRET;
  if (typeof pinata_api_key !== 'string' || typeof pinata_secret_api_key !== 'string') {
    return Promise.reject(new Error('missing an env import'));
  }

  const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
  const headers = {
    'Content-Type': 'application/json',
    pinata_api_key,
    pinata_secret_api_key,
  };

  return fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ pinataContent: signedData }),
  })
  .then(response => {
    if (response.ok) {
      return response.json().then((result: any) => result.IpfsHash as string);
    } else {
      throw new Error('Failed to post data to IPFS');
    }
  })
  .catch(error => {
    console.error(error);
    throw new Error('Error posting data to IPFS');
  });
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


export default useSessionCases;
