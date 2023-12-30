import { useState } from 'react'
import { useAsyncEffect } from './utils/useAsyncEffect';
import { UseIsOnboardedParam  } from '../types/types'
import { useContextNullCheck } from './utils/useContextNullCheck';
import { AuthContext } from '../contexts/AuthContext';
import { loadAccountAndSessionKeys } from '../utils/app'

export const useIsOnboarded = ( {checkIsOnboarded}: UseIsOnboardedParam  ) => {
  const { supabaseClient } = useContextNullCheck(AuthContext)
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(false);
  const {currentAccount, sessionKeys} = loadAccountAndSessionKeys();

  useAsyncEffect(
    async () => {
      if (currentAccount && sessionKeys) {
      console.log('hello');
      console.log('supabaseClient?', supabaseClient);
      if (supabaseClient) {
        try {
          console.log('tried');

          if (!currentAccount?.ethAddress) throw new Error('no current account address')
          let { data: User, error: supabaseError } = await supabaseClient
            .from('User')
            .select('USER_ADDRESS')
            .eq('USER_ADDRESS', currentAccount?.ethAddress)
            .single()
          if (!supabaseError) {
            setIsOnboarded(true);
          } else {
            setIsOnboarded(false);
            console.log({User})
          }
        } catch(e) {
          throw new Error(`Error: ${e}`)
        }
      }
    }},
    async () => Promise.resolve(),
    [currentAccount, checkIsOnboarded]
  )
  return {isOnboarded, setIsOnboarded};
}

