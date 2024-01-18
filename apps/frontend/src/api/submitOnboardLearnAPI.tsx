import { Database } from '../supabaseTypes';
import { ErrorModal } from '../Components/Errors/ErrorModal'
import { SupabaseClient } from '@supabase/supabase-js';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { LocalStorageSetter } from '../types/types';

export const submitOnboardLearnAPI = async (learningLangs: string[] , isOnboarded: boolean | null, name: string, hasBalance: boolean | null, setIsOnboarded:LocalStorageSetter<boolean>, supabaseClient: SupabaseClient, currentAccount: IRelayPKP, sessionSigs: SessionSigs)=> {

  if (isOnboarded === false && currentAccount && sessionSigs &&  learningLangs.length && name.length && supabaseClient ) {
    if (hasBalance === false) {
      return <ErrorModal errorText="To learn you either need money in your account or you need to be a teacher" />
      //OPTIM: Better user handling
    } else if (hasBalance === null) {
      throw new Error('check hasBalance should have been run but has not been')
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

