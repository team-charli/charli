import { Database } from '../supabaseTypes';
import { ErrorModal } from '../Components/Errors/ErrorModal'
import { SupabaseClient } from '@supabase/supabase-js';
import { Dispatch, SetStateAction } from 'react'
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';

export const submitOnboardLearnAPI = async (learningLangs: string[] , isOnboarded: boolean, name: string, hasBalance: boolean, setIsOnboarded: Dispatch<SetStateAction<boolean| null>> , currentAccount: IRelayPKP , sessionSigs: SessionSigs, supabaseClient: SupabaseClient, jwt: string)=> {

  if (!isOnboarded && currentAccount && sessionSigs &&  learningLangs.length && name.length && jwt?.length && supabaseClient ) {
    if (!hasBalance) {
      return <ErrorModal errorText="To learn you either need money in your account or you need to be a teacher" />
      //OPTIM: Better user handling
    }
    const insertData: Database["public"]["Tables"]["User"]["Insert"] = {
      NAME: name,
      WANTS_TO_LEARN_LANGS: learningLangs,
      USER_ADDRESS: currentAccount.ethAddress,
      DEFAULT_NATIVE_LANGUAGE: 'ENG',
    };

    const { data:User, error } = await supabaseClient
      .from('User')
      .insert([insertData])
      .select();

    if (User) {
      console.log('insertedRows', User);
      setIsOnboarded(true);
    } else if (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to insert user data');
    }
    //TODO: on success, implement cacheing
  } else {
    throw new Error('User is already onboarded or missing required data');
  }
}

