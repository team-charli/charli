// useGenerateHuddleAccessToken.tsx
import { useCallback } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { useSupabaseClient } from '@/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';

// Types
export interface InvokeCreateAccessTokenWith {
  roomId: string;
  role: "teacher" | "learner";
  hashedUserAddress: string;
}

interface HuddleAccessTokenResponse {
  status: string;
  accessToken: string;
  roomId: string;
}

export const useGenerateHuddleAccessToken = () => {
  const { data: supabaseClient } = useSupabaseClient();

  const [huddleAccessToken, setHuddleAccessToken] = useLocalStorage<string | null>('huddle-access-token', null);

  const mutation = useMutation<HuddleAccessTokenResponse, Error, InvokeCreateAccessTokenWith>({
    mutationFn: async ({ roomId, role, hashedUserAddress }) => {
      if (!supabaseClient) {
        throw new Error('supabaseClient undefined');
      }

      const { data, error } = await supabaseClient.functions.invoke<HuddleAccessTokenResponse>(
        'create-huddle-access-tokens',
        {
          body: JSON.stringify({
            roomId,
            role,
            hashedUserAddress,
          }),
        }
      );

      if (error) {
        throw new Error(error);
      }
      if (!data) {
        throw new Error('No data received from the server');
      }
      if (!data.accessToken || Object.keys(data.accessToken).length === 0) {
        throw new Error('no accessToken data in response');
      }

      setHuddleAccessToken(data.accessToken);
      return data;
    },
  });

  const generateAccessToken = useCallback(
    async (params: InvokeCreateAccessTokenWith) => {
      if (!params.roomId) throw new Error('roomId is undefined');
      await mutation.mutateAsync(params);
    },
    [mutation]
  );

  return {
    generateAccessToken,
    huddleAccessToken,
    isLoading: mutation.status === 'pending',
    error: mutation.error,
  };
};
