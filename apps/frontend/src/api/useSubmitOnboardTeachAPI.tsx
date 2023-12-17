import { useContextNullCheck } from '../hooks/utils/useContextNullCheck';
import { useAsyncEffect } from '../hooks/utils/useAsyncEffect'
import {OnboardContext} from '../contexts/OnboardContext';
import { AuthContext } from '../contexts/AuthContext';
import { Database } from '../supabaseTypes';

export const useSubmitOnboardTeachAPI = () => {
  const {isOnboarded, setIsOnboarded, teachingLangs, name} = useContextNullCheck(OnboardContext)
  const { currentAccount, sessionSigs, jwt, supabaseClient } = useContextNullCheck(AuthContext, 'currentAccount', 'sessionSigs', 'jwt', 'supabaseClient');


  useAsyncEffect( async () => {

    if (!isOnboarded && currentAccount && sessionSigs &&  teachingLangs.length && name.length && jwt?.length && supabaseClient ) {
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
  },
    async () => Promise.resolve(),
    [isOnboarded, currentAccount, sessionSigs, teachingLangs, name, jwt, supabaseClient]
  )
}

