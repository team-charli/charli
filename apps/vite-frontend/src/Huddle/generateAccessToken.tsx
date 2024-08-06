import { LocalStorageSetStateValue } from "@rehooks/local-storage/lib/use-localstorage";
import { SupabaseClient } from "@supabase/supabase-js";

export const generateAccessToken = async (event: React.MouseEvent<HTMLAnchorElement>, supabaseClient: SupabaseClient | null, supabaseLoading: boolean, huddle_room_id: string, setHuddleAccessToken: (newValue: LocalStorageSetStateValue<string> | null) => void) =>
 {
    event.preventDefault();
    if (supabaseClient && !supabaseLoading && huddle_room_id?.length) {

      const { data, error } = await supabaseClient
        .functions
        .invoke('create-huddle-access-tokens', {
          body: huddle_room_id
        })
      if (!error) {
        console.log('generated Huddle AccessToken')
        setHuddleAccessToken(data.accessToken);
      }
    }
  }

