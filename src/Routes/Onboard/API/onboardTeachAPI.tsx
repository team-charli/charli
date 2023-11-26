import {useContext} from 'react';
import {StateContext, ContextObj} from '../../../contexts/StateContext';
import { supabase } from '../../../supabaseClient';
import { Database } from '../../../supabaseTypes';


interface SubmitOnboardTeachParams {
 langs: string[];
 name: string;
}
//FIX: auth protect db read/write?

export const submitOnboardTeach = async ({langs, name}:SubmitOnboardTeachParams ) => {
  let context: ContextObj | null
  context  = useContext(StateContext);


  let pkpKey
  if (context?.keys.pkpKey[0] !== undefined && context?.onBoard?.onboardData?.name.length && context?.onBoard?.onboardData?.wantsToTeachLangs?.length) {

    pkpKey = context.keys.pkpKey;
    name = context.onBoard.onboardData.name;
    langs = context.onBoard.onboardData.wantsToTeachLangs;

    const insertData: Database["public"]["Tables"]["User"]["Insert"] = {

      NAME: name,
      WANTS_TO_TEACH_LANGS: langs,
      USER_ADDRESS: pkpKey[0],
      DEFAULT_NATIVE_LANGUAGE: 'ENG',
    };

    const { data:User, error } = await supabase
      .from('User')
      .insert([insertData])
      .select();
    const insertedRows: Database["public"]["Tables"]["User"]["Row"][] | null = User;

    User ? context.onBoard.setHasOnboarded(true) && console.log('insertedRows', insertedRows) : console.log(error);
  } else {
    throw new Error('missing inputs')
  }
}
