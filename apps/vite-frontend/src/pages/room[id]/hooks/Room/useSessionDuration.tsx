import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useLocalStorage from '@rehooks/local-storage';
import { useLitAccount, useSessionSigs, useSupabaseClient, usePkpWallet } from "@/contexts/AuthContext";
import { SessionDurationData } from '@/types/types';
import { useMemo } from 'react';
import { useSessionsContext } from '@/contexts/SessionsContext';

const pinata_api_key = import.meta.env.VITE_PINATA_API_KEY;
const pinata_secret_api_key = import.meta.env.VITE_PINATA_API_SECRET;

export const useSessionDuration = (sessionId: string) => {
  const queryClient = useQueryClient();
  const { sessionsContextValue } = useSessionsContext();
  const [userId] = useLocalStorage<number>("userID");
  const { data: currentAccount } = useLitAccount();
  const { data: sessionSigs } = useSessionSigs();
  const { data: supabaseClient, isLoading: supabaseLoading } = useSupabaseClient();
  const { data: pkpWallet } = usePkpWallet();

  const currentSession = useMemo(() =>
    sessionsContextValue.find(s => s.session_id.toString() === sessionId) || null,
    [sessionsContextValue, sessionId]);

  const userRole = useMemo(() =>
    currentSession ? (currentSession.learner_id === userId ? 'learner' : 'teacher') : null,
    [currentSession, userId]);

  const retrieveJSONFromIPFS = async (ipfsHash: string): Promise<SessionDurationData> => {
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const response = await fetch(url);
    const data: SessionDurationData = await response.json();
    return data;
  };

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

  const { data: sessionDurationData, isLoading, isError } = useQuery({
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
        throw new Error('Error retrieving session data from Supabase');
      }

      if (sessionData) {
        const { learner_signed_duration_ipfs_cid, teacher_signed_duration_ipfs_cid } = sessionData;

        let learnerData = learner_signed_duration_ipfs_cid ? await retrieveJSONFromIPFS(learner_signed_duration_ipfs_cid) : null;
        let teacherData = teacher_signed_duration_ipfs_cid ? await retrieveJSONFromIPFS(teacher_signed_duration_ipfs_cid) : null;

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

  const signSessionDurationMutation = useMutation({
    mutationFn: async () => {
      if (!currentSession || !userRole || !pkpWallet || !supabaseClient) {
        throw new Error('Missing required data or dependencies');
      }

      const durationDataToSign = { sessionId, sessionDuration: currentSession.requested_session_duration };
      const signature = await pkpWallet.signMessage(JSON.stringify(durationDataToSign));
      const signedData = { ...durationDataToSign, signature };
      const ipfsHash = await pinJSONToIPFS(signedData);

      const updateField = userRole === 'learner' ? 'learner_signed_duration_ipfs_cid' : 'teacher_signed_duration_ipfs_cid';
      await supabaseClient
        .from('sessions')
        .update({ [updateField]: ipfsHash })
        .eq('session_id', sessionId);

      return ipfsHash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionDuration', sessionId] });
    },
    onError: (error) => {
      console.error("Error signing session duration:", error);
    }
  });

  const isSignatureRequired = useMemo(() => {
    if (!userRole || !sessionDurationData) return false;
    return userRole === 'learner' ? !sessionDurationData.learnerData : !sessionDurationData.teacherData;
  }, [userRole, sessionDurationData]);

  const isBothSigned = sessionDurationData?.bothSigned || false;

  return {
    sessionDurationData,
    signSessionDuration: signSessionDurationMutation.mutateAsync,
    isSignatureRequired,
    isBothSigned,
    isLoading: isLoading || signSessionDurationMutation.isPending,
    isError: isError || signSessionDurationMutation.isError,
  };
};
