import { useSupabase } from "@/contexts";
import useLocalStorage from "@rehooks/local-storage";

export const useGenerateHuddleAccessToken = () => {
  const [huddleAccessToken, setHuddleAccessToken] = useLocalStorage('huddle-access-token');
  const { client: supabaseClient, supabaseLoading } = useSupabase();

  const generateAccessToken = async (roomId: string | undefined, event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (supabaseClient && !supabaseLoading && roomId?.length) {
      const { data, error } = await supabaseClient
        .functions
        .invoke('create-huddle-access-tokens', {
          body: roomId
        });
      if (!error) {
        console.log('Generated Huddle AccessToken');
        setHuddleAccessToken(data.accessToken);
      }
    }
  };

  return { generateAccessToken, huddleAccessToken };
};
