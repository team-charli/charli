import useLocalStorage from "@rehooks/local-storage";
import { useSupabase } from "../../contexts/SupabaseContext";
import { useAsyncEffect } from "../utils/useAsyncEffect"
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import { useNetwork } from "../../contexts/NetworkContext";

const useGetLanguages = () => {
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  const { isOnline } = useNetwork();

  const teachingLangs = useAsyncEffect(async () => {
    if (supabaseClient && !supabaseLoading && isOnline) {
      try {

        let { data: User, error } = await supabaseClient
          .from('User')
          .select('WANTS_TO_TEACH_LANGS')
      } catch (e) {
        console.error(e)
      }
    }
  },
    async () => Promise.resolve(),
    []
  )

  const learningLangs = useAsyncEffect(async () => {
    if (supabaseClient && !supabaseLoading && isOnline) {
      try {
        let { data: User, error } = await supabaseClient
          .from('User')
          .select('WANTS_TO_LEARN_LANGS')
      } catch (e) {
        console.error(e)
      }
    }
  },
    async () => Promise.resolve(),
    []
  )
  return {teachingLangs, learningLangs}
}
export default useGetLanguages
