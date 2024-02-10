import { useAsyncEffect } from './utils/useAsyncEffect';
import useLocalStorage from '@rehooks/local-storage';
import { LocalStorageSetter } from '../types/types';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { SupabaseClient } from '@supabase/supabase-js';

export const useIsOnboarded = (isOnboarded: boolean | null, setIsOnboarded:LocalStorageSetter<boolean>, supabaseClient: SupabaseClient| null, supabaseLoading: boolean  ) => {
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')

  useAsyncEffect(
    async () => {
      if (currentAccount && sessionSigs && supabaseClient && !supabaseLoading) {
        try {
          console.log('check isOnboarded');
          let response = await supabaseClient
            // let { data: User, error: supabaseError } = await supabaseClient
            .from('User')
            .select('USER_ADDRESS')
            .eq('USER_ADDRESS', currentAccount?.ethAddress)
            .single()
          console.log('isOnboarded: response', response)
          if (!response.error) {
            console.log('has db ethAddress');
            setIsOnboarded(true);
          } else {
            console.log('set isOnboarded: false')
            setIsOnboarded(false);
          }
        } catch(e) {
          console.log('isOnboarded catch hit')
          throw new Error(`Error: ${e}`)
        }

      }},
    async () => Promise.resolve(),
    [supabaseClient, isOnboarded, supabaseLoading]
  )
  return {isOnboarded, setIsOnboarded};
}

