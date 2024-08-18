// useSessionDurationIPFS.tsx
import { useMutation } from '@tanstack/react-query';
import { IPFSResponse, SessionDurationData } from "../../types/types";
import { useLitAccount, useSessionSigs, useSupabaseClient, usePkpWallet } from "@/contexts/AuthContext";

const pinata_api_key = import.meta.env.VITE_PINATA_API_KEY;
const pinata_secret_api_key = import.meta.env.VITE_PINATA_API_SECRET;

export const useSessionDurationIPFS = () => {
  const { data: currentAccount } = useLitAccount();
  const { data: sessionSigs } = useSessionSigs();
  const { data: supabaseClient, isLoading: supabaseLoading } = useSupabaseClient();
  const { data: pkpWallet } = usePkpWallet();

  const pinJSONToIPFS = async (data: any): Promise<string> => {
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    if (!pinata_api_key || !pinata_secret_api_key) throw new Error(`Missing one or both pinata envs`);
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

  const signAndStoreToIPFSMutation = useMutation({
    mutationFn: async ({
      userRole,
      sessionId,
      sessionDuration,
      ipfsHash
    }: {
      userRole: 'teacher' | 'learner',
      sessionId: string,
      sessionDuration: number,
      ipfsHash?: string
    }) => {
      if (!currentAccount || !sessionSigs || !supabaseClient || supabaseLoading || !pkpWallet) {
        throw new Error('Missing required dependencies');
      }

      const durationDataToSign: SessionDurationData = { sessionId, sessionDuration };

      if (userRole === 'learner') {
        const learnerSignature = await signMessageMutation.mutateAsync(JSON.stringify(durationDataToSign));
        const signedLearnerData: SessionDurationData = { ...durationDataToSign, learnerSignature };
        const newIpfsHash = await pinJSONToIPFS(signedLearnerData);

        await supabaseClient
          .from('sessions')
          .update({ learner_signed_duration_ipfs_cid: newIpfsHash })
          .eq('session_id', sessionId);

        return newIpfsHash;
      } else if (userRole === 'teacher' && ipfsHash) {
        const retrievedLearnerData = await retrieveJSONFromIPFS(ipfsHash);
        const teacherSignature = await signMessageMutation.mutateAsync(JSON.stringify(retrievedLearnerData));
        const signedTeacherData: SessionDurationData = { ...retrievedLearnerData, teacherSignature };
        const finalIpfsHash = await pinJSONToIPFS(signedTeacherData);

        await supabaseClient
          .from('sessions')
          .update({ teacher_signed_duration_ipfs_cid: finalIpfsHash })
          .eq('session_id', sessionId);

        return finalIpfsHash;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => 1000 * 2 ** attemptIndex,
    onError: (error) => {
      console.error("Error in signAndStoreToIPFS:", error);
    }
  });

  const getIPFSDurationMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!supabaseClient || supabaseLoading) {
        throw new Error('Supabase client not available');
      }

      const { data: sessionData, error } = await supabaseClient
        .from('sessions')
        .select('learner_signed_duration_ipfs_cid, teacher_signed_duration_ipfs_cid')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        throw new Error('Error retrieving session data from Supabase');
      }

      if (sessionData) {
        const { teacher_signed_duration_ipfs_cid } = sessionData;
        const teacherSignedData = await retrieveJSONFromIPFS(teacher_signed_duration_ipfs_cid);
        return {
          cid: teacher_signed_duration_ipfs_cid,
          data: teacherSignedData,
        } as IPFSResponse;
      }

      return undefined;
    },
    retry: 3,
    retryDelay: (attemptIndex) => 1000 * 2 ** attemptIndex,
    onError: (error) => {
      console.error("Error in getIPFSDuration:", error);
    }
  });

  return {
    signAndStoreToIPFS: signAndStoreToIPFSMutation.mutateAsync,
    getIPFSDuration: getIPFSDurationMutation.mutateAsync
  };
};
