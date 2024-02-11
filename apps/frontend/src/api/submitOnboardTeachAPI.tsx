import { SupabaseClient } from '@supabase/supabase-js';
import { Dispatch, SetStateAction } from 'react'
import { Database } from '../supabaseTypes';
import { LocalStorageSetter } from '../types/types';
import { IRelayPKP, SessionSig, SessionSigs } from '@lit-protocol/types';

export const submitOnboardTeachAPI = async (isOnboarded: boolean | null, setIsOnboarded:LocalStorageSetter<boolean>, teachingLangs: string[], name: string, supabaseClient: SupabaseClient, currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null, isOnline: boolean) => {

  if (isOnboarded === false && currentAccount && sessionSigs &&  teachingLangs.length && name.length&& supabaseClient && isOnline ) {
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

