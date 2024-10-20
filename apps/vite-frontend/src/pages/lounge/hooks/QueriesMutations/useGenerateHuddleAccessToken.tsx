// useGenerateHuddleAccessToken.tsx
import { useCallback } from "react";
import { useLocalStorage } from "@rehooks/local-storage";
import { useSupabaseClient } from "@/contexts/AuthContext";
import { useMutation, UseMutationResult } from "@tanstack/react-query";

interface HuddleAccessTokenResponse {
  accessToken: string;
}

type GenerateAccessTokenFn = (roomId: string | null | undefined) => Promise<void>;

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
    mutationFn: async (roomId: string | null | undefined) => {
      if (!supabaseClient) throw new Error('supabaseClient undefined')
      console.log("invoke create-huddle-access-tokens");

      const { data, error } = await supabaseClient.functions.invoke<HuddleAccessTokenResponse>('create-huddle-access-tokens', {
        body: JSON.stringify({ roomId })
      });

      if (error) throw new Error(error);
      if (!data) throw new Error("No data received from the server");
      if (!data?.accessToken || Object.keys(data.accessToken).length === 0) {
        throw new Error("no accessToken data in response");
      }
      console.log('storing huddle accessToken')
      setHuddleAccessToken(data.accessToken);
      return data;
    },
  });

  const generateAccessToken: GenerateAccessTokenFn = useCallback(async (roomId: string | null | undefined) => {
    if (!roomId) throw new Error('sessionData.roomId is undefined')
    await mutation.mutateAsync(roomId);
  }, [mutation]);

  return {
    generateAccessToken,
    huddleAccessToken,
    isLoading: mutation.status === 'pending',
    error: mutation.error
  };
};
