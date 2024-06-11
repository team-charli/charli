import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../supabaseTypes';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { CurrencyEuroIcon } from '@heroicons/react/20/solid';
import { litNodeClient } from '@/utils/litClients';
import { LocalStorageSetter } from '@/types/types';

export const submitOnboardTeachAPI = async (selectedLanguageCodes: number[], isOnboarded: boolean | null, setIsOnboarded:LocalStorageSetter<boolean>, name: string, supabaseClient: SupabaseClient | null, supabaseLoading: boolean, currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null, isLitLoggedIn: boolean | null, defaultNativeLanguage: string) => {

  if (isLitLoggedIn && isOnboarded === false && currentAccount && sessionSigs &&  selectedLanguageCodes.length && name.length && supabaseClient && !supabaseLoading ) {
    try {
      const insertData: Database["public"]["Tables"]["user_data"]["Insert"] = {
        name: name,
        wants_to_teach_langs: selectedLanguageCodes, // modified structure 2 tables
        user_address: currentAccount.ethAddress,
        default_native_language: defaultNativeLanguage,
      };

      const { data:user_data, error } = await supabaseClient
        .from('user_data')
        .insert([insertData])
        .select();
      const insertedRows: Database["public"]["Tables"]["user_data"]["Row"][] | null = user_data;

      if (user_data) {
        console.log('insertedRows', insertedRows)
        setIsOnboarded(true);

      } else if (error) {
        console.error("onboard submission error", error)
        litNodeClient.disconnect()
        throw new Error("submitOnboardTeachAPI error")
      }
    } catch (e) {
      console.error(e)
    }
  } else {
    console.error("Missing Values", {isLitLoggedIn, isOnboarded, currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), selectedLanguageCodes, name, supabaseClient: Boolean(supabaseClient), supabaseLoading});
    throw new Error('missing  {isLitLoggedIn, isOnboarded, currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs), selectedLanguageCodes, name, supabaseClient: Boolean(supabaseClient), supabaseLoading} ')
  }
}


