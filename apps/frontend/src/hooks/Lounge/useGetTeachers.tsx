import { useEffect, useState } from "react";
import { useSupabase } from "../../contexts/SupabaseContext";
import useLocalStorage from "@rehooks/local-storage";

interface FetchTeachersResponse {
  name: string;
  wants_to_teach_langs: string[];
  id: number;
}

function useGetTeachers(selectedLang: string, modeView: string) {
  const [userId] = useLocalStorage<number>("userID");
  const {client: supabaseClient, supabaseLoading } = useSupabase();
  const [teachers, setTeachers] = useState<FetchTeachersResponse[] | null> ([]);

  useEffect(() => {
    async function fetchData() {
      // console.log("userGroup", modeView)
      if (modeView === 'Learn' && supabaseClient && !supabaseLoading) {
        try {
          let {data: user_data, error} =  await supabaseClient
            .from('user_data')
            .select('*')
            .contains('wants_to_teach_langs', [selectedLang]);
          setTeachers(user_data?.filter(user => user.id !== userId) || []);

        } catch (e) {
          throw new Error(`Error ${e}`)
        }
      }
    }

    fetchData();
  }, [selectedLang, modeView]);

  return teachers;
}

export default useGetTeachers
