import { useAsyncEffect } from '../utils/useAsyncEffect';
import useLocalStorage from '@rehooks/local-storage';
import { LocalStorageSetter } from '../../types/types';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { useNetwork } from '../../contexts/NetworkContext';

export const useIsOnboarded = (isOnboarded: boolean | null, setIsOnboarded:LocalStorageSetter<boolean>, supabaseClient: SupabaseClient| null, supabaseLoading: boolean  ) => {
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  const { isOnline } = useNetwork();
  useAsyncEffect(
    async () => {
      if (currentAccount && sessionSigs && supabaseClient && !supabaseLoading /*&& isOnline*/) {
        try {
          console.log('check isOnboarded');
          let response = await supabaseClient
            .from('User')
            .select('user_address')
            .eq('user_address', currentAccount?.ethAddress)
            .single()
          console.log('isOnboarded?', true)
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

