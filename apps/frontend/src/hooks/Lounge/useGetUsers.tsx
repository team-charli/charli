import { useEffect, useState } from "react";
import { useSupabase } from "../../contexts/SupabaseContext";

interface FetchTeachersResponse {
  name: string;
  wants_to_teach_langs: string[];
}

interface FetchLearnersResponse {
  name: string;
  wants_to_learn_langs: string[];
}

function useGetUsers(selectedLang: string, showUserGroup: string) {
  const {client: supabaseClient, supabaseLoading } = useSupabase();
  const [users, setUsers] = useState<FetchTeachersResponse[] | FetchLearnersResponse[] | null> ([]);

  useEffect(() => {
    async function fetchData() {
      console.log("userGroup", showUserGroup)
      if (showUserGroup === 'Learn') {
        // Fetch teachers
        try {
          if (supabaseClient && !supabaseLoading) {
            let {data: user_data, error} =  await supabaseClient
              .from('user_data')
              .select('*')
              .contains('wants_to_teach_langs', [selectedLang]);
            console.log('teachers user_data', user_data)
            console.log('selectedLang', selectedLang)
            setUsers(user_data);
          }
        } catch (e) {
          throw new Error(`Error ${e}`)
        }
      } else if (showUserGroup === 'Teach') {
        try {
          if (supabaseClient && !supabaseLoading) {
            const {data: user_data, error} = await supabaseClient
              .from('user_data')
              .select('*')
              .contains('wants_to_learn_langs', [selectedLang]);
              console.log('selectedLang', selectedLang)
              console.log('learners user_data', user_data)
            setUsers(user_data);
          }
        } catch (e) {
          throw new Error(`Error ${e}`)
        }
      }
    }

    fetchData();
  }, [selectedLang, showUserGroup]);

  return users;
}

export default useGetUsers
