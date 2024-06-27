import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import useLocalStorage from "@rehooks/local-storage";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import { IPFSResponse, SessionDurationData } from "../../types/types";
import { supabaseClientAtom } from "@/atoms/SupabaseClient/supabaseClientAtom";
import { useAtom } from "jotai";
const pinata_api_key = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const pinata_secret_api_key = process.env.NEXT_PUBLIC_PINATA_API_SECRET;

export const useSessionDurationIPFS = () => {
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');
  const [{ data: supabaseClient, isLoading: supabaseLoading }] = useAtom(supabaseClientAtom);

  const pinJSONToIPFS = async (data: any): Promise<string> => {
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    if (!pinata_api_key || !pinata_secret_api_key) throw new Error(`Missing one or both pinaata envs `)
    const headers = {
      'Content-Type': 'application/json',
      pinata_api_key,
      pinata_secret_api_key
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    const result: { IpfsHash: string } = await response.json();
    return result.IpfsHash;
  };

  const retrieveJSONFromIPFS = async (ipfsHash: string): Promise<SessionDurationData> => {
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const response = await fetch(url);
    const data: SessionDurationData = await response.json();
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

  const getIPFSDuration = (sessionId: string): Promise<IPFSResponse | undefined> => {
    if (supabaseClient && !supabaseLoading) {
      return new Promise<IPFSResponse | undefined>((resolve) => {
        void supabaseClient
          .from('sessions')
          .select('learner_signed_duration_ipfs_cid, teacher_signed_duration_ipfs_cid')
          .eq('session_id', sessionId)
          .single()
          .then(({ data: sessionData, error }) => {
            if (error) {
              console.error('Error retrieving session data from Supabase:', error);
              resolve(undefined);
              return;
            }

            if (sessionData) {
              const { teacher_signed_duration_ipfs_cid } = sessionData;
              retrieveJSONFromIPFS(teacher_signed_duration_ipfs_cid)
                .then((teacherSignedData) => {
                  const response: IPFSResponse = {
                    cid: teacher_signed_duration_ipfs_cid,
                    data: teacherSignedData,
                  };
                  resolve(response);
                })
                .catch((error: unknown) => {
                  console.error('Error retrieving JSON from IPFS:', error);
                  resolve(undefined);
                });
            } else {
              resolve(undefined);
            }
          });
      });
    }

    return Promise.resolve(undefined);
  };

  return { signAndStoreToIPFS, getIPFSDuration };
};


