// useGenerateHuddleAccessToken.tsx
import { useCallback } from "react";
import { useLocalStorage } from "@rehooks/local-storage";
import { useSupabaseClient } from "@/contexts/AuthContext";
import { useMutation, UseMutationResult } from "@tanstack/react-query";

// Types
export type InvokeCreateAccessTokenWith = {
  roomId: string | undefined;
  role: "teacher" | "learner";
  hashedUserAddress: string | undefined;
}

interface HuddleAccessTokenResponse {
  accessToken: string;
}

// useGenerateHuddleAccessToken.tsx
export const useGenerateHuddleAccessToken = () => {
  const { data: supabaseClient } = useSupabaseClient();
  const [huddleAccessToken, setHuddleAccessToken] = useLocalStorage<string | null>('huddle-access-token', null);

  const mutation = useMutation<HuddleAccessTokenResponse, Error, InvokeCreateAccessTokenWith>({
    mutationFn: async ({ roomId, role, hashedUserAddress }: InvokeCreateAccessTokenWith) => {
      if (!supabaseClient) throw new Error('supabaseClient undefined')
      console.log("invoke create-huddle-access-tokens", { roomId, role, hashedUserAddress });

      const { data, error } = await supabaseClient.functions.invoke<HuddleAccessTokenResponse>('create-huddle-access-tokens', {
        body: JSON.stringify({
          roomId,
          role,
          hashedUserAddress
        })
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

  const generateAccessToken = useCallback(async (params: InvokeCreateAccessTokenWith) => {
    if (!params.roomId) throw new Error('roomId is undefined')
    await mutation.mutateAsync(params);
  }, [mutation]);

  return {
    generateAccessToken,
    huddleAccessToken,
    isLoading: mutation.status === 'pending',
    error: mutation.error
  };
};

