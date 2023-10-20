import { supabase } from '../../../../supabaseClient';
import { Database } from '../../../../supabaseTypes';

interface SubmitOnboardTeachType {
  langs: string[];
  name: string;
}

export const submitOnboardTeach = async ({ langs, name }: SubmitOnboardTeachType) => {
  const insertData: Database["public"]["Tables"]["User"]["Insert"] = {

    NAME: name,
    WANTS_TO_TEACH_LANGS: langs,
    HAS_WALLET_DEPLOYED: false,
    DEFAULT_NATIVE_LANGUAGE: 'ENG',
  };

  const { data:User, error } = await supabase
    .from('User')
    .insert([insertData])
    .select();
    const insertedRows: Database["public"]["Tables"]["User"]["Row"][] | null = User;

    User ? console.log('insertedRows', insertedRows) : console.log(error);

}
