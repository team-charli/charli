import useLocalStorage from "@rehooks/local-storage";
import { useSupabase } from "../../contexts/SupabaseContext";
import { useAsyncEffect } from "../utils/useAsyncEffect"
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import { useNetwork } from "../../contexts/NetworkContext";
import { UseGetLanguagesResult } from "../../types/types";

const useGetLanguages = (): UseGetLanguagesResult => {
  // console.log('useGetLanguages');

  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  // const { isOnline } = useNetwork();
  // console.log({supabaseClient, supabaseLoading,  isOnline})

  const wantsToTeachLangs = useAsyncEffect(async () => {
    if (supabaseClient && !supabaseLoading /*&& isOnline*/) {
      try {
        let { data: teachingLangs, error } = await supabaseClient
          .from('User')
          .select('wants_to_teach_langs');
        console.log("teachingLangs", teachingLangs )
        return teachingLangs;
      } catch (e) {
        console.error(e)
      }
    }
  },
    async () => Promise.resolve(),
    []
  )

  const wantsToLearnLangs = useAsyncEffect(async () => {
    if (supabaseClient && !supabaseLoading && isOnline) {
      try {
        let { data: learningLangs, error } = await supabaseClient
          .from('User')
          .select('wants_to_learn_langs');
        console.log("learningLangs", learningLangs);

        return learningLangs
      } catch (e) {
        console.error(e)
      }
    }
  },
    async () => Promise.resolve(),
    []
  )

return {
    wantsToTeachLangs: wantsToTeachLangs.result || [],
    wantsToLearnLangs: wantsToLearnLangs.result || [],
    isLoading: wantsToTeachLangs.isLoading || wantsToLearnLangs.isLoading,
    error: wantsToTeachLangs.error || wantsToLearnLangs.error,
  };
}
export default useGetLanguages
