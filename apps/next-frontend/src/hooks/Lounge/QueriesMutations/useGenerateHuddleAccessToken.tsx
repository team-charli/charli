// useGenerateHuddleAccessToken.tsx
import { useCallback } from "react";
import { useLocalStorage } from "@rehooks/local-storage";
import { useSupabaseClient } from "@/contexts/AuthContext";
import { useMutation, UseMutationResult } from "@tanstack/react-query";

interface HuddleAccessTokenResponse {
  accessToken: string;
}

type GenerateAccessTokenFn = (roomId: string) => Promise<void>;

interface UseGenerateHuddleAccessTokenResult {
  generateAccessToken: GenerateAccessTokenFn;
  huddleAccessToken: string | null;
  isLoading: boolean;
  error: Error | null;
}

export const useGenerateHuddleAccessToken = (): UseGenerateHuddleAccessTokenResult => {
  const { data: supabaseClient } = useSupabaseClient();
  const [huddleAccessToken, setHuddleAccessToken] = useLocalStorage<string | null>('huddle-access-token', null);

  const mutation = useMutation<HuddleAccessTokenResponse, Error, string>({
    mutationFn: async (roomId: string) => {
      if (!supabaseClient) throw new Error('supabaseClient undefined')
      const { data, error } = await supabaseClient.functions.invoke<HuddleAccessTokenResponse>('create-huddle-access-tokens', {
        body: { roomId }
      });

      if (error) throw error;
      if (!data) throw new Error("No data received from the server");

      setHuddleAccessToken(data.accessToken);
      console.log('Generated Huddle AccessToken');
      return data;
    },
  });

  const generateAccessToken: GenerateAccessTokenFn = useCallback(async (roomId: string) => {
    await mutation.mutateAsync(roomId);
  }, [mutation]);

  return {
    generateAccessToken,
    huddleAccessToken,
    isLoading: mutation.status === 'pending',
    error: mutation.error
  };
};
