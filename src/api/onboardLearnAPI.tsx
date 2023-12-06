import { supabase } from '../supabaseClient';

import { Database } from '../supabaseTypes';
import { OnboardContext } from '../contexts/OnboardContext';
import { AuthContext } from '../contexts/AuthContext';
import { useContextNullCheck } from "../hooks/utils/useContextNullCheck";
import { ErrorModal } from '../Components/Errors/ErrorModal'
interface SubmitOnboardLearnType {
  langs: string[];
  name: string;
}
// FIX: auth protect db read/write?

export const submitOnboardLearn = async ({ langs, name }: SubmitOnboardLearnType) => {

  const {isOnboarded, setIsOnboarded, hasBalance} = useContextNullCheck(OnboardContext)
  const { contextCurrentAccount, contextSessionSigs} = useContextNullCheck(AuthContext);


  if (!isOnboarded && contextCurrentAccount && langs.length && name.length && !hasBalance) {
    if (!hasBalance) {
      return <ErrorModal errorText="To learn you either need money in your account or you need to be a teacher" />
      //OPTIM: Better user handling
    }
  } else if (!isOnboarded && contextCurrentAccount && contextSessionSigs && langs.length && name.length )  {
    const insertData: Database["public"]["Tables"]["User"]["Insert"] = {
      NAME: name,
      WANTS_TO_LEARN_LANGS: langs,
      USER_ADDRESS: contextCurrentAccount.ethAddress,
      DEFAULT_NATIVE_LANGUAGE: 'ENG',
    };

    const { data:User, error } = await supabase
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
  } else {
    throw new Error('User is already onboarded or missing required data');
  }
}

