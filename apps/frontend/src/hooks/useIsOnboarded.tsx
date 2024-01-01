import { useState, useEffect } from 'react'
import { useAsyncEffect } from './utils/useAsyncEffect';
import { UseIsOnboardedParam  } from '../types/types'
import { useContextNullCheck } from './utils/useContextNullCheck';
import { AuthContext } from '../contexts/AuthContext';
import { loadAccountAndSessionKeys } from '../utils/app'

export const useIsOnboarded = ( {checkIsOnboarded, setCheckIsOnboarded}: UseIsOnboardedParam  ) => {
  const { supabaseClient } = useContextNullCheck(AuthContext)
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(false);

  useEffect(() => {
    setCheckIsOnboarded(prev => !prev)
  }, [])
//FIX: After supabaseClient works

  useAsyncEffect(
    async () => {
      const {currentAccount, sessionSigs} = loadAccountAndSessionKeys();
      if (currentAccount && sessionSigs) {
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
    [checkIsOnboarded, supabaseClient]
  )
  return {isOnboarded, setIsOnboarded};
}

