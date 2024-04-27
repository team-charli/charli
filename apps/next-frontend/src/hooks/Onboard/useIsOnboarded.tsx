import { useAsyncEffect } from '../utils/useAsyncEffect';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { SupabaseClient } from '@supabase/supabase-js';

export const useIsOnboarded = (supabaseClient: SupabaseClient| null, supabaseLoading: boolean  ) => {
  const [isOnboarded, setIsOnboarded] = useLocalStorage<boolean>('isOnboarded');
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  const [ isLitLoggedIn ] = useLocalStorage("isLitLoggedIn");
  const [userID, setUserID] = useLocalStorage("userID")
  //FIX:: value from Context is 'undefined'
  useAsyncEffect(
    async () => {
    // console.warn({isOnboarded, currentAccount:Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), supabaseClient: Boolean(supabaseClient), supabaseLoading })
      if (isLitLoggedIn && currentAccount && sessionSigs && supabaseClient && !supabaseLoading /*&& isOnline*/) {
        try {
          console.log('run isOnboarded');
          const { data, error } = await supabaseClient
            .from("user_data")
            .select("id, user_address")
            .eq("user_address", currentAccount?.ethAddress)
            .single();
          if (!error) {
            console.log('isOnboarded:', true)
            setUserID(data.id);
            setIsOnboarded(true);
          } else {
            console.log('isOnboarded:', false)
            setIsOnboarded(false);
          }
        } catch(e) {
          // console.log('isOnboarded catch hit')
          throw new Error(`Error: ${e}`)
        }

      }},
    async () => Promise.resolve(),
    [supabaseClient, isOnboarded, supabaseLoading, isLitLoggedIn, currentAccount, sessionSigs]
  )
  return {isOnboarded, setIsOnboarded};
}

