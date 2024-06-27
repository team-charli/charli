import { Database } from '../supabaseTypes';
import { SupabaseClient } from '@supabase/supabase-js';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { LocalStorageSetter } from '../types/types';
import { litNodeClient } from '@/utils/litClients';

export const submitOnboardLearnAPI = async (selectedLanguageCodes: number[], isOnboarded: boolean | undefined, setIsOnboarded:LocalStorageSetter<boolean>, name: string, hasBalance: boolean | null | undefined,  supabaseClient: SupabaseClient | null | undefined, supabaseLoading: boolean, currentAccount: IRelayPKP | null | undefined, sessionSigs: SessionSigs | null, isLitLoggedIn: boolean | null, nativeLang: string)=> {
  try {
    if (isLitLoggedIn && isOnboarded === false && currentAccount && sessionSigs &&  selectedLanguageCodes.length && name.length && supabaseClient && !supabaseLoading) {
      if (hasBalance === false) {
        return false;
        // <ErrorModal errorText="To learn you either need money in your account or you need to be a teacher" />
        //OPTIM: Modal choose /Bolsa/addBalnce || /Teach
      } else if (hasBalance === null) {
        throw new Error('check hasBalance should have been run but has not been')
      }
      const insertData: Database["public"]["Tables"]["user_data"]["Insert"] = {
        name: name,
        wants_to_learn_langs: selectedLanguageCodes,
        user_address: currentAccount.ethAddress,
        default_native_language: nativeLang,
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
        console.log('disconnect -- submitOnboardLearnAPI');

        litNodeClient.disconnect()
        throw new Error('Failed to insert user data');
      }
    }
    else {
      console.error("Missing Values", {isLitLoggedIn, isOnboarded, currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), selectedLanguageCodes, name, supabaseClient: Boolean(supabaseClient), supabaseLoading});
      throw new Error('missing  {isLitLoggedIn, isOnboarded, currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), selectedLanguageCodes, name, supabaseClient: Boolean(supabaseClient), supabaseLoading} ')
    }
  } catch (e) {
    console.error('submitOnboardLearn error', e)
  }
}

