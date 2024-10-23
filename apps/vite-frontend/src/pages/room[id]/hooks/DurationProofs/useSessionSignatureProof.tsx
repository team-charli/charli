// useSessionSignatureProof.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { useProofSigning } from './useProofSigning';
import { useSignatureStorage } from './useSignatureStorage';
import { SessionDurationData } from '@/types/types';
import { useSupabaseClient } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useNotifications } from '@/pages/lounge/hooks/useNotifications';
import { useSessionsContext } from '@/contexts/SessionsContext';

export const useSessionSignatureProof = (sessionId: string) => {
  const {data: supabaseClient} = useSupabaseClient();
  const { sessionsContextValue } = useSessionsContext();

  const sessionDuration = sessionsContextValue
    .find((session) => session.session_id.toString() === sessionId && session.confirmed_time_date.length > 0)?.requested_session_duration;

  const { createSignature, createCounterSignature } = useProofSigning();
  const { storeSignatureProof, retrieveExistingProof, recordProofLocation } = useSignatureStorage();

  // Check for existing proofs
  const { data: existingProofs } = useQuery({
    queryKey: ['sessionProofs', sessionId],
    queryFn: async () => {
      if (!supabaseClient ) {
        throw new Error('Supabase client not available');
      }

      const { data } = await supabaseClient
        .from('sessions')
        .select('initial_signature_ipfs_cid, countersignature_ipfs_cid')
        .eq('session_id', sessionId)
        .single();

      return {
        initialProof: data?.initial_signature_ipfs_cid,
        counterSignature: data?.countersignature_ipfs_cid
      };
    }
  });

  // Internal mutation to handle the entire proof process
  const processDurationProof = useMutation({
    mutationFn: async () => {
      if (!existingProofs?.initialProof) {
        // Create initial signature
        const signedData: SessionDurationData = {
          sessionId,
          sessionDuration,
          timestamp: Date.now()
        };
        const signature = await createSignature(signedData);
        const proofWithSignature = { ...signedData, signature };
        const ipfsHash = await storeSignatureProof(proofWithSignature);
        await recordProofLocation({
          sessionId,
          ipfsHash,
          isCounterSignature: false
        });
        return 'INITIAL_PROOF_CREATED';
      } else if (!existingProofs.counterSignature) {
        // Create counter signature
        const initialProof = await retrieveExistingProof(existingProofs.initialProof);
        const counterSignature = await createCounterSignature(initialProof);
        const proofWithBothSignatures = {
          ...initialProof,
          counterSignature
        };
        const ipfsHash = await storeSignatureProof(proofWithBothSignatures);
        await recordProofLocation({
          sessionId,
          ipfsHash,
          isCounterSignature: true
        });
        return 'COUNTER_PROOF_CREATED';
      }
      return 'PROOFS_EXIST';
    }
  });

  // Automatically process proof when component mounts
  useEffect(() => {
    processDurationProof.mutate();
  }, []);

  return {
    processedDurationProof: processDurationProof.isSuccess,
    isProcessing: processDurationProof.isPending,
    error: processDurationProof.error
  };
};
