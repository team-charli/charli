import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import useLocalStorage from "@rehooks/local-storage";
import { useSupabase } from "../../contexts/SupabaseContext";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import { IPFSResponse, SessionDurationData } from "../../types/types";
import { useState } from "react";

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;;
const PINATA_API_SECRET = import.meta.env.VITE_PINATA_API_SECRET;

export const useSessionDurationIPFS = () => {
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const [ipfsResponse, setIPFSResponse] = useState<IPFSResponse | undefined>(undefined);

  const pinJSONToIPFS = async (data: any) => {
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    const headers = {
      'Content-Type': 'application/json',
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_API_SECRET,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result.IpfsHash;
  };

  const retrieveJSONFromIPFS = async (ipfsHash: string) => {
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  };

  const signAndStoreToIPFS = async (
    userRole: 'teacher' | 'learner',
    sessionId: string,
    sessionDuration: number,
    ipfsHash?: string
  ): Promise<string | undefined> => {
    if (currentAccount && sessionSigs && supabaseClient && !supabaseLoading) {
      const durationDataToSign: SessionDurationData = { sessionId, sessionDuration };

      const pkpWallet = new PKPEthersWallet({
        pkpPubKey: currentAccount.publicKey,
        controllerSessionSigs: sessionSigs,
      });

      await pkpWallet.init();

      if (userRole === 'learner') {
        const learnerSignature = await pkpWallet.signMessage(JSON.stringify(durationDataToSign));
        const signedLearnerData: SessionDurationData = { ...durationDataToSign, learnerSignature };
        const newIpfsHash = await pinJSONToIPFS(signedLearnerData);

        // Store the learner's IPFS hash in Supabase
        await supabaseClient
        .from('sessions')
        .update({ learner_signed_duration_ipfs_cid: newIpfsHash })
        .eq('session_id', sessionId);

        return newIpfsHash;
      } else if (userRole === 'teacher' && ipfsHash) {
        const retrievedLearnerData = await retrieveJSONFromIPFS(ipfsHash);
        const teacherSignature = await pkpWallet.signMessage(JSON.stringify(retrievedLearnerData));
        const signedTeacherData: SessionDurationData = { ...retrievedLearnerData, teacherSignature };
        const finalIpfsHash = await pinJSONToIPFS(signedTeacherData);

        // Store the teacher's IPFS hash in Supabase
        await supabaseClient
        .from('sessions')
        .update({ teacher_signed_duration_ipfs_cid: finalIpfsHash })
        .eq('session_id', sessionId);

        return finalIpfsHash;
      }
    }
  };

  const getIPFSDuration = (sessionId: string): IPFSResponse | undefined => {
    if (supabaseClient && !supabaseLoading) {
      supabaseClient
        .from('sessions')
        .select('learner_signed_duration_ipfs_cid, teacher_signed_duration_ipfs_cid')
        .eq('session_id', sessionId)
        .single()
        .then(async ({ data: sessionData, error }) => {
          if (error) {
            console.error('Error retrieving session data from Supabase:', error);
            setIPFSResponse(undefined);
            return;
          }

          if (sessionData) {
            const { teacher_signed_duration_ipfs_cid } = sessionData;
            const teacherSignedData = await retrieveJSONFromIPFS(teacher_signed_duration_ipfs_cid);

            setIPFSResponse({
              cid: teacher_signed_duration_ipfs_cid,
              data: teacherSignedData,
            });
          }
        });
    }
    return ipfsResponse;
  };

  return { signAndStoreToIPFS, getIPFSDuration };
};


