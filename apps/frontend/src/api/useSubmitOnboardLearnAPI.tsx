import { useContextNullCheck } from "../hooks/utils/useContextNullCheck";
import { useAsyncEffect } from '../hooks/utils/useAsyncEffect'
import { OnboardContext } from '../contexts/OnboardContext';
import { AuthContext } from '../contexts/AuthContext';
import { Database } from '../supabaseTypes';

import { ErrorModal } from '../Components/Errors/ErrorModal'

export const useSubmitOnboardLearnAPI = () => {
  const {isOnboarded, setIsOnboarded, learningLangs, name, hasBalance} = useContextNullCheck(OnboardContext)
  const { currentAccount,  sessionSigs, jwt, supabaseClient } = useContextNullCheck(AuthContext, 'currentAccount', 'sessionSigs', 'jwt', 'supabaseClient');

  useAsyncEffect(async () => {

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
  },
    async () => Promise.resolve(),
    [isOnboarded, currentAccount, sessionSigs, learningLangs, name, jwt, supabaseClient]

  )

}

