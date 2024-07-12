import { useState, useCallback } from "react";
import { useSupabaseQuery } from "../Auth/SupabaseClient/useSupabaseQuery";
import useLocalStorage from "@rehooks/local-storage";

interface HuddleAccessTokenResponse {
  accessToken: string | undefined;
}

export const useGenerateHuddleAccessToken = (): {
  generateAccessToken: (roomId: string) => Promise<void>;
  huddleAccessToken: string | null | undefined ;
  isLoading: boolean;
  error: Error | null;
} => {
  const [huddleAccessToken, setHuddleAccessToken] = useLocalStorage<string | null>('huddle-access-token', null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const { refetch, isLoading, error } = useSupabaseQuery<HuddleAccessTokenResponse, Error>(
    ['generateHuddleAccessToken', roomId],

    async (supabaseClient) => {
      if (!roomId) throw new Error("Room ID is required");

      const { data, error } = await supabaseClient.functions.invoke('create-huddle-access-tokens', {
        body: roomId
      });

      if (error) throw error;

      // Set the huddleAccessToken here
      const accessToken = data.accessToken;
      setHuddleAccessToken(accessToken);
      console.log('Generated Huddle AccessToken');

      return data as HuddleAccessTokenResponse;
    },
    {
      enabled: false, // Don't run the query automatically
    }
  );

  const generateAccessToken = useCallback(async (newRoomId: string) => {
    setRoomId(newRoomId);
    await refetch();
  }, [refetch]);

  return {
    generateAccessToken,
    huddleAccessToken,
    isLoading,
    error: error || null
  };
};
