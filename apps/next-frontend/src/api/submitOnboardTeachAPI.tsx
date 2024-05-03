import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../supabaseTypes';
import { LocalStorageSetter } from '../types/types';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { CurrencyEuroIcon } from '@heroicons/react/20/solid';

export const submitOnboardTeachAPI = async (selectedLanguageCodes: string[], isOnboarded: boolean | null, setIsOnboarded:LocalStorageSetter<boolean>, name: string, supabaseClient: SupabaseClient | null, supabaseLoading: boolean, currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null, isLitLoggedIn: boolean | null) => {

  if (isLitLoggedIn && isOnboarded === false && currentAccount && sessionSigs &&  selectedLanguageCodes.length && name.length && supabaseClient && !supabaseLoading ) {
    try {
    const insertData: Database["public"]["Tables"]["user_data"]["Insert"] = {
      name: name,
      wants_to_teach_langs: selectedLanguageCodes, // modified structure 2 tables
      user_address: currentAccount.ethAddress,
      default_native_language: 'ENG',
    };

    const { data:user_data, error } = await supabaseClient
      .from('user_data')
      .insert([insertData])
      .select();
    const insertedRows: Database["public"]["Tables"]["user_data"]["Row"][] | null = user_data;

    if (user_data) {
      console.log('insertedRows', insertedRows)
    } else if (error) {
     console.error("onboard submission error", error)
     throw new Error("submitOnboardTeachAPI error")
    }
    setIsOnboarded(true)
    return true
  } catch (e) {
    console.error(e)
  }
} else {
    console.error("Missing Values", {isLitLoggedIn, isOnboarded, currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), selectedLanguageCodes, name, supabaseClient: Boolean(supabaseClient), supabaseLoading});
    throw new Error('missing  {isLitLoggedIn, isOnboarded, currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), selectedLanguageCodes, name, supabaseClient: Boolean(supabaseClient), supabaseLoading} ')
  }
}
