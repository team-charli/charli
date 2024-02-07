import { useAsyncEffect } from './utils/useAsyncEffect';
import useLocalStorage from '@rehooks/local-storage';
import { LocalStorageSetter } from '../types/types';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { SupabaseClient } from '@supabase/supabase-js';

export const useIsOnboarded = (isOnboarded: boolean | null, setIsOnboarded:LocalStorageSetter<boolean>, supabaseClient: SupabaseClient| null, supabaseLoading: boolean  ) => {
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  // console.log('useIsOnboarded', {currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), supabaseClient: Boolean(supabaseClient)})
  // console.log('supabase val', supabaseClient)

  useAsyncEffect(
    async () => {
      if (currentAccount && sessionSigs && supabaseClient && !supabaseLoading) {
        try {
          console.log('check db ethAddress');

          if (!currentAccount?.ethAddress) throw new Error('no current account address')
          let { data: User, error: supabaseError } = await supabaseClient
            .from('User')
            .select('USER_ADDRESS')
            .eq('USER_ADDRESS', currentAccount?.ethAddress)
            .single()
          if (!supabaseError) {
            console.log('has db ethAddress');
            setIsOnboarded(true);
          } else {
            console.log('set isOnboarded: false')
            setIsOnboarded(false);
          }
        } catch(e) {
          throw new Error(`Error: ${e}`)
        }

    }},
    async () => Promise.resolve(),
    [supabaseClient, isOnboarded, supabaseLoading]
  )
  return {isOnboarded, setIsOnboarded};
}

