import { useState } from 'react'
import { useAsyncEffect } from './utils/useAsyncEffect';
import { UseIsOnboardedParam  } from '../types/types'
import { useContextNullCheck } from './utils/useContextNullCheck';
import { AuthContext } from '../contexts/AuthContext';

export const useIsOnboarded = ( {contextCurrentAccount: currentAccount}: UseIsOnboardedParam  ) => {


  const {supabaseClient} = useContextNullCheck(AuthContext)

  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  useAsyncEffect(
    async () => {
      if (supabaseClient) {
        try {
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
    },
    async () => Promise.resolve(),
    [currentAccount]

  )
  return {isOnboarded, setIsOnboarded};
}

