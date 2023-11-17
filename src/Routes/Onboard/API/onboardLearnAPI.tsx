import { supabase } from '../../../supabaseClient';

import { Database } from '../../../supabaseTypes';
import { useContext } from "react";
import { StateContext } from '../../../contexts/StateContext';
import { useContextNullCheck } from "../../../hooks/utils/useContextNullCheck";
import {ErrorModal} from '../../../Components/Errors/ErrorModal'
interface SubmitOnboardLearnType {
  langs: string[];
  name: string;
  hasBalance: boolean;
  teachingLangs: string[];
}
// TODO: implement same type of checks as you did with submitTeach

export const submitOnboardLearn = async ({ langs, name }: SubmitOnboardLearnType) => {

  let stateContext = useContext(StateContext);

  if (!stateContext) {
    throw new Error('stateContext is null');
  }

  const { teachingLangs, hasBalance, keys: {pkpKey, sessionKey} } = stateContext;

  if (!hasBalance || !teachingLangs.length) {
    // TODOx Modal error/modal: must have balance or be a teacher
    throw new Error('stateContext is null');

  } else if (pkpKey.length && Object.keys(sessionKey).length  )  {

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

