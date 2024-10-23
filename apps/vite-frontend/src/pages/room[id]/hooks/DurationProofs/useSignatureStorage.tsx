// useSignatureStorage.ts
import { useMutation } from '@tanstack/react-query';
import { useSupabaseClient } from "@/contexts/AuthContext";
import { SessionDurationData } from '@/types/types';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_API_SECRET;

export const useSignatureStorage = () => {
  const { data: supabaseClient } = useSupabaseClient();

  const storeProofMutation = useMutation({
    mutationFn: async (signedData: SessionDurationData): Promise<string> => {
      if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
        throw new Error('Missing Pinata credentials');
      }

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY
        },
        body: JSON.stringify(signedData),
      });

      if (!response.ok) {
        throw new Error('Failed to store proof on IPFS');
      }

      const { IpfsHash } = await response.json();
      return IpfsHash;
    }
  });

  const retrieveProofMutation = useMutation({
    mutationFn: async (ipfsHash: string): Promise<SessionDurationData> => {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);

      if (!response.ok) {
        throw new Error('Failed to retrieve proof from IPFS');
      }

      return response.json();
    }
  });

  const recordLocationMutation = useMutation({
    mutationFn: async ({
      sessionId,
      ipfsHash,
      isCounterSignature
    }: {
      sessionId: string;
      ipfsHash: string;
      isCounterSignature: boolean;
    }) => {
      if (!supabaseClient) {
        throw new Error('Supabase client not available');
      }

      const field = isCounterSignature ?
        'countersignature_ipfs_cid' :
        'initial_signature_ipfs_cid';

      const { error } = await supabaseClient
        .from('sessions')
        .update({ [field]: ipfsHash })
        .eq('session_id', sessionId);

      if (error) {
        throw new Error('Failed to record proof location');
      }
    }
  });

  return {
    storeSignatureProof: storeProofMutation.mutateAsync,
    retrieveExistingProof: retrieveProofMutation.mutateAsync,
    recordProofLocation: recordLocationMutation.mutateAsync,
    isProcessing:
      storeProofMutation.isPending ||
      retrieveProofMutation.isPending ||
      recordLocationMutation.isPending
  };
};
