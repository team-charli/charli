import { SupabaseClient } from '@supabase/supabase-js';
import { Dispatch, SetStateAction } from 'react'
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { Database } from '../supabaseTypes';
import { loadAccountAndSessionKeys } from '../utils/app';

export const submitOnboardTeachAPI = async (isOnboarded: boolean, setIsOnboarded:Dispatch<SetStateAction<boolean| null>>, teachingLangs: string[], name: string, supabaseClient: SupabaseClient) => {

  const {currentAccount, sessionSigs} = loadAccountAndSessionKeys();
  if (!isOnboarded && currentAccount && sessionSigs &&  teachingLangs.length && name.length /*&& jwt?.length*/ && supabaseClient ) {
    const insertData: Database["public"]["Tables"]["User"]["Insert"] = {
      NAME: name,
      WANTS_TO_TEACH_LANGS: teachingLangs,
      USER_ADDRESS: currentAccount.ethAddress,
      DEFAULT_NATIVE_LANGUAGE: 'ENG',
    };

    const { data:User, error } = await supabaseClient
      .from('User')
      .insert([insertData])
      .select();
    const insertedRows: Database["public"]["Tables"]["User"]["Row"][] | null = User;

    User ? console.log('insertedRows', insertedRows) : console.log(error);
    setIsOnboarded(true)
    return true
  } else {
    throw new Error(`Failed to insert`)
  }
}

