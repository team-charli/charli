import { Database } from '../supabaseTypes';
import { SupabaseClient } from '@supabase/supabase-js';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { LocalStorageSetter } from '../types/types';
import { ErrorModal } from '@/components/ErrorModal';

export const submitOnboardLearnAPI = async (learningLangs: string[], isOnboarded: boolean | null, name: string, hasBalance: boolean | null, setIsOnboarded:LocalStorageSetter<boolean>, supabaseClient: SupabaseClient | null, supabaseLoading: boolean, currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null, isLitLoggedIn: boolean | null)=> {
try {
  if (isLitLoggedIn && isOnboarded === false && currentAccount && sessionSigs &&  learningLangs.length && name.length && supabaseClient) {
    if (hasBalance === false) {
      return <ErrorModal errorText="To learn you either need money in your account or you need to be a teacher" />
      //OPTIM: Modal choose /Bolsa/addBalnce || /Teach
    } else if (hasBalance === null) {
      throw new Error('check hasBalance should have been run but has not been')
    }
    const insertData: Database["public"]["Tables"]["user_data"]["Insert"] = {
      name: name,
      wants_to_learn_langs: learningLangs,
      user_address: currentAccount.ethAddress,
      default_native_language: 'English',
    };

    const { data:user_data, error } = await supabaseClient
      .from('user_data')
      .insert([insertData])
      .select();

    if (user_data) {
      console.log('insertedRows', user_data);
      setIsOnboarded(true);
    } else if (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to insert user data');
    }
  } else {
    // console.warn({isOnboarded, currentAccount:Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), learningLangsLength: learningLangs.length, nameLength: name.length, supabaseClient: Boolean(supabaseClient) })
    throw new Error('User is already onboarded or missing required data');
  }
 } catch (e) {
   console.error('submitOnboardLearn error', e)
  }
}

