import { useState } from 'react'
import { useAsyncEffect } from './utils/useAsyncEffect';
import {  useAuthContext } from '../contexts/AuthContext';
import { useSupabase } from '../contexts/SupabaseContext';
import useLocalStorage from '@rehooks/local-storage';
import { LocalStorageSetter } from '../types/types';

export const useIsOnboarded = (isOnboarded: boolean | null, setIsOnboarded:LocalStorageSetter<boolean>) => {
  const { client: supabaseClient } = useSupabase();
  const {currentAccount, sessionSigs} = useAuthContext();
  useAsyncEffect(
    async () => {
      if (currentAccount && sessionSigs && supabaseClient) {
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
            setIsOnboarded(false);
            console.log({User})
          }
        } catch(e) {
          throw new Error(`Error: ${e}`)
        }

    }},
    async () => Promise.resolve(),
    [supabaseClient, isOnboarded]
  )
  return {isOnboarded, setIsOnboarded};
}

