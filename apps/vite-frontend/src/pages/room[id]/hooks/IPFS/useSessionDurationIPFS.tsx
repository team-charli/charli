// useSessionDurationIPFS.tsx
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLitAccount, useSessionSigs, useSupabaseClient, usePkpWallet } from "@/contexts/AuthContext";
import { SessionDurationData } from '@/types/types';

const pinata_api_key = import.meta.env.VITE_PINATA_API_KEY;
const pinata_secret_api_key = import.meta.env.VITE_PINATA_API_SECRET;

export const useSessionDurationIPFS = (sessionId: string) => {
  const { data: currentAccount } = useLitAccount();
  const { data: sessionSigs } = useSessionSigs();
  const { data: supabaseClient, isLoading: supabaseLoading } = useSupabaseClient();
  const { data: pkpWallet } = usePkpWallet();

  const signAndStoreAsLearner = useMutation({
    mutationFn: async (sessionDuration: number) => {
      if (!currentAccount || !sessionSigs || !supabaseClient || supabaseLoading || !pkpWallet) {
        throw new Error('Missing required dependencies');
      }
      console.log("signAndStoreAsLearner");

      const durationDataToSign: SessionDurationData = { sessionId, sessionDuration };
      const learnerSignature = await signMessageMutation.mutateAsync(JSON.stringify(durationDataToSign));
      const signedLearnerData: SessionDurationData = { ...durationDataToSign, learnerSignature };
      const newIpfsHash = await pinJSONToIPFS(signedLearnerData);

      await supabaseClient
      .from('sessions')
      .update({ learner_signed_duration_ipfs_cid: newIpfsHash })
      .eq('session_id', sessionId);
      return newIpfsHash;
    },
  });

  const signAndStoreAsTeacher = useMutation({
    mutationFn: async (learnerIpfsHash: string) => {
      if (!currentAccount || !sessionSigs || !supabaseClient || supabaseLoading || !pkpWallet) {
        throw new Error('Missing required dependencies');
      }
      console.log("signAndStoreAsTeacher");
      const retrievedLearnerData = await retrieveJSONFromIPFS(learnerIpfsHash);
      const teacherSignature = await signMessageMutation.mutateAsync(JSON.stringify(retrievedLearnerData));
      const signedTeacherData: SessionDurationData = { ...retrievedLearnerData, teacherSignature };
      const finalIpfsHash = await pinJSONToIPFS(signedTeacherData);

      await supabaseClient
      .from('sessions')
      .update({ teacher_signed_duration_ipfs_cid: finalIpfsHash })
      .eq('session_id', sessionId);
      return finalIpfsHash;
    },
  });

  const { data: sessionDurationData } = useQuery({
    queryKey: ['sessionDuration', sessionId],
    queryFn: async () => {
      if (!supabaseClient || supabaseLoading) {
        throw new Error('Supabase client not available');
      }

      const { data: sessionData, error } = await supabaseClient
        .from('sessions')
        .select('learner_signed_duration_ipfs_cid, teacher_signed_duration_ipfs_cid')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        console.error('Error retrieving session data from Supabase', error);
        throw new Error('Error retrieving session data from Supabase');
      }

      if (sessionData) {
        const { learner_signed_duration_ipfs_cid, teacher_signed_duration_ipfs_cid } = sessionData;

        let learnerData: SessionDurationData | null = null;
        let teacherData: SessionDurationData | null = null;

        if (learner_signed_duration_ipfs_cid) {
          learnerData = await retrieveJSONFromIPFS(learner_signed_duration_ipfs_cid);
        }

        if (teacher_signed_duration_ipfs_cid) {
          teacherData = await retrieveJSONFromIPFS(teacher_signed_duration_ipfs_cid);
        }

        return {
          learnerData,
          teacherData,
          bothSigned: !!learnerData && !!teacherData
        };
      }

      return null;
    },
    enabled: !!supabaseClient && !supabaseLoading,
  });

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


  return {
    signAndStoreAsLearner: signAndStoreAsLearner.mutateAsync,
    signAndStoreAsTeacher: signAndStoreAsTeacher.mutateAsync,
    sessionDurationData,
    isLoading: signAndStoreAsLearner.isPending || signAndStoreAsTeacher.isPending || supabaseLoading,
    isError: signAndStoreAsLearner.isError || signAndStoreAsTeacher.isError,
  };
};
