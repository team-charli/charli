import {  useState } from 'react'
import { supabase } from '../supabaseClient';
import useAccounts from './Lit/useLitAccount';
import { useAsyncEffect } from './utils/useAsyncEffect';


export const useIsOnboarded = () => {
const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const { currentAccount } = useAccounts();

  useAsyncEffect(
    async () => {
      try {
        if (!currentAccount?.ethAddress) throw new Error('no current account address')
        let { data: User, error: supabaseError } = await supabase
          .from('User')
          .select('USER_ADDRESS')
          .eq('USER_ADDRESS', currentAccount?.ethAddress)
          .single()
        if (supabaseError) setIsOnboarded(false);
        console.log({User})
      } catch(e) {

        throw new Error(`Error: ${e}`)
      }
    },
    async () => Promise.resolve(),
  [currentAccount]
  )
  return isOnboarded;
}

