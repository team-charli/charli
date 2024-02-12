import { useAsyncEffect } from '../utils/useAsyncEffect';
import useLocalStorage from '@rehooks/local-storage';
import { LocalStorageSetter } from '../../types/types';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { SupabaseClient } from '@supabase/supabase-js';
// import { useNetwork } from '../../contexts/NetworkContext';
// import { useAuthContext } from '../../contexts/AuthContext';

export const useIsOnboarded = (supabaseClient: SupabaseClient| null, supabaseLoading: boolean  ) => {
  const [isOnboarded, setIsOnboarded] = useLocalStorage<boolean>('isOnboarded');
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  const [ isLitLoggedIn ] = useLocalStorage("isLitLoggedIn");
  // const { isOnline } = useNetwork();
  // const { isLitLoggedIn } = useAuthContext();
  //FIX:: value from Context is 'undefined'
  useAsyncEffect(
    async () => {
    console.warn({isOnboarded, currentAccount:Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), supabaseClient: Boolean(supabaseClient), supabaseLoading })
      if (isLitLoggedIn && currentAccount && sessionSigs && supabaseClient && !supabaseLoading /*&& isOnline*/) {
        try {
          console.log('run isOnboarded');
          let response = await supabaseClient
            .from("user_data")
            .select("user_address")
            .eq("user_address", currentAccount?.ethAddress)
            .single()
          if (!response.error) {
            console.log('isOnboarded:', true)
            setIsOnboarded(true);
          } else {
            console.log('isOnboarded:', false)
            setIsOnboarded(false);
          }
        } catch(e) {
          console.log('isOnboarded catch hit')
          throw new Error(`Error: ${e}`)
        }

      }},
    async () => Promise.resolve(),
    [supabaseClient, isOnboarded, supabaseLoading, isLitLoggedIn, currentAccount, sessionSigs]
  )
  return {isOnboarded, setIsOnboarded};
}

