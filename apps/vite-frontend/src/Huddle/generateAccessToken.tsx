import { InvokeCreateAccessTokenWith } from "@/pages/lounge/hooks/QueriesMutations/useGenerateHuddleAccessToken";
import { LocalStorageSetStateValue } from "@rehooks/local-storage/lib/use-localstorage";
import { SupabaseClient } from "@supabase/supabase-js";

export const generateAccessToken = async (
  event: React.MouseEvent<HTMLAnchorElement>,
  supabaseClient: SupabaseClient | null,
  supabaseLoading: boolean,
  params: InvokeCreateAccessTokenWith,
  setHuddleAccessToken: (newValue: LocalStorageSetStateValue<string> | null) => void
) => {
  event.preventDefault();
  if (supabaseClient && !supabaseLoading && params.roomId?.length) {
    const { data, error } = await supabaseClient
      .functions
      .invoke('create-huddle-access-tokens', {
        body: JSON.stringify(params)
      })
    if (!error) {
      console.log('generated Huddle AccessToken')
      setHuddleAccessToken(data.accessToken);
    }
  } else {
    throw new Error(`no supabaseClient or roomId`)
  }
}
