import { supabaseClientAtom } from "@/atoms/supabaseClientAtom";
import useLocalStorage from "@rehooks/local-storage";
import { useAtomValue } from "jotai";

export const useGenerateHuddleAccessToken = () => {
  const [huddleAccessToken, setHuddleAccessToken] = useLocalStorage('huddle-access-token');
  const supabaseClient  = useAtomValue(supabaseClientAtom);

  const generateAccessToken = async (roomId: string | undefined, event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (supabaseClient && roomId?.length) {
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
