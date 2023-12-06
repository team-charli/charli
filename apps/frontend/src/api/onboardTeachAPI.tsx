import {OnboardContext} from '../contexts/OnboardContext';
import { supabase } from '../supabaseClient';
import { Database } from '../supabaseTypes';
import { useContextNullCheck } from '../hooks/utils/useContextNullCheck';
import { AuthContext } from '../contexts/AuthContext';


interface SubmitOnboardTeachParams {
  langs: string[];
  name: string;
}
//FIX: auth protect db read/write?

export const submitOnboardTeach = async ({langs, name}:SubmitOnboardTeachParams ) => {
  const {isOnboarded, setIsOnboarded} = useContextNullCheck(OnboardContext)

  const {contextCurrentAccount, contextSessionSigs } = useContextNullCheck(AuthContext)

  if (!isOnboarded && contextCurrentAccount && contextSessionSigs &&  langs.length && name.length) {
    const insertData: Database["public"]["Tables"]["User"]["Insert"] = {
      NAME: name,
      WANTS_TO_TEACH_LANGS: langs,
      USER_ADDRESS: contextCurrentAccount.ethAddress,
      DEFAULT_NATIVE_LANGUAGE: 'ENG',
    };

    const { data:User, error } = await supabase
      .from('User')
      .insert([insertData])
      .select();
    const insertedRows: Database["public"]["Tables"]["User"]["Row"][] | null = User;

  User ? console.log('insertedRows', insertedRows) : console.log(error);
    return true
  } else {
    throw new Error(`Failed to insert`)
  }
}

