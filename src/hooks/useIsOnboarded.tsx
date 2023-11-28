import {  useState } from 'react'
import { supabase } from '../supabaseClient';
import { useAsyncEffect } from './utils/useAsyncEffect';
import { UseIsOnboardedParam  } from '../types/types'

export const useIsOnboarded = ( {contextCurrentAccount: currentAccount}: UseIsOnboardedParam  ) => {

const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  useAsyncEffect(
    async () => {
      try {
        if (!currentAccount?.ethAddress) throw new Error('no current account address')
        let { data: User, error: supabaseError } = await supabase
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
    },
    async () => Promise.resolve(),
  [currentAccount]
  )
  return isOnboarded;
}

