import { Database } from '../supabaseTypes';
import { ErrorModal } from '../Components/Errors/ErrorModal'
import { SupabaseClient } from '@supabase/supabase-js';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { LocalStorageSetter } from '../types/types';

export const submitOnboardLearnAPI = async (learningLangs: string[], isOnboarded: boolean | null, name: string, hasBalance: boolean | null, setIsOnboarded:LocalStorageSetter<boolean>, supabaseClient: SupabaseClient, currentAccount: IRelayPKP, sessionSigs: SessionSigs, isOnline: boolean)=> {
try {
  if (isOnboarded === false && currentAccount && sessionSigs &&  learningLangs.length && name.length && supabaseClient && isOnline) {
    if (hasBalance === false) {
      return <ErrorModal errorText="To learn you either need money in your account or you need to be a teacher" />
      //OPTIM: Modal choose /Bolsa/addBalnce || /Teach
    } else if (hasBalance === null) {
      throw new Error('check hasBalance should have been run but has not been')
    }
    const insertData: Database["public"]["Tables"]["User"]["Insert"] = {
      NAME: name,
      WANTS_TO_LEARN_LANGS: learningLangs,
      USER_ADDRESS: currentAccount.ethAddress,
      DEFAULT_NATIVE_LANGUAGE: 'English',
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
    console.warn({isOnboarded, currentAccount:Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), learningLangsLength: learningLangs.length, nameLength: name.length, supabaseClient: Boolean(supabaseClient) })
    throw new Error('User is already onboarded or missing required data');
  }
 } catch (e) {
   console.error('submitOnboardLearn error', e)
  }
}

