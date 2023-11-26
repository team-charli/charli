import { supabase } from '../../../supabaseClient';

import { Database } from '../../../supabaseTypes';
import { StateContext } from '../../../contexts/StateContext';
import { AuthContext } from '../../../contexts/AuthContext';
import { useContextNullCheck } from "../../../hooks/utils/useContextNullCheck";
import {ErrorModal} from '../../../Components/Errors/ErrorModal'
interface SubmitOnboardLearnType {
  langs: string[];
  name: string;
  hasBalance: boolean;
  teachingLangs: string[];
}
// TODO: implement same type of checks as you did with submitTeach
// FIX: auth protect db read/write?

export const submitOnboardLearn = async ({ langs, name }: SubmitOnboardLearnType) => {

  const { teachingLangs, hasBalance } = useContextNullCheck(StateContext) ;
  const { contextCurrentAccount, contextSessionSigs} = useContextNullCheck(AuthContext);


  if (!hasBalance || !teachingLangs.length) {
    // TODOx Modal error/modal: must have balance or be a teacher
    throw new Error('stateContext is null');

  } else if (contextCurrentAccount && contextSessionSigs )  {
  const insertData: Database["public"]["Tables"]["User"]["Insert"] = {
    NAME: name,
    WANTS_TO_LEARN_LANGS: langs,
    USER_ADDRESS: "",
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

