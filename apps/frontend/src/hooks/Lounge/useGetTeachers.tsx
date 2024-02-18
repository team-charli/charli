import { useEffect, useState } from "react";
import { useSupabase } from "../../contexts/SupabaseContext";

interface FetchTeachersResponse {
  name: string;
  wants_to_teach_langs: string[];
  id: number;
}

function useGetTeachers(selectedLang: string, modeView: string) {
  const {client: supabaseClient, supabaseLoading } = useSupabase();
  const [users, setUsers] = useState<FetchTeachersResponse[] | null> ([]);

  useEffect(() => {
    async function fetchData() {
      console.log("userGroup", modeView)
      if (modeView === 'Learn' && supabaseClient && !supabaseLoading) {
        try {
          let {data: user_data, error} =  await supabaseClient
            .from('user_data')
            .select('*')
            .contains('wants_to_teach_langs', [selectedLang]);
          console.log('teachers user_data', user_data)
          console.log('selectedLang', selectedLang)
          setUsers(user_data);

        } catch (e) {
          throw new Error(`Error ${e}`)
        }
      }
    }

    fetchData();
  }, [selectedLang, modeView]);

  return users;
}

export default useGetTeachers
