import { useEffect, useState } from "react";
import useLocalStorage from "@rehooks/local-storage";
import { useAtom, useAtomValue } from "jotai";
import { supabaseClientAtom } from "@/atoms/supabaseClientAtom";

interface FetchTeachersResponse {
  name: string;
  wants_to_teach_langs: string[];
  id: number;
}

function useGetTeachers(selectedLang: string, modeView: string) {
  const [userId] = useLocalStorage<number>("userID");
  const supabaseClient = useAtomValue(supabaseClientAtom);
  const [teachers, setTeachers] = useState<FetchTeachersResponse[] | null> ([]);

  useEffect(() => {
    async function fetchData() {
      // console.log("userGroup", modeView)
      if (modeView === 'Learn' && supabaseClient) {
        try {
          const {data: user_data, error} =  await supabaseClient
            .from('user_data')
            .select('*')
            .contains('wants_to_teach_langs', [selectedLang]);
          setTeachers(user_data?.filter(user => user.id !== userId) || []);

          if (user_data) {
            console.log(user_data)
          } else if (error){
            console.log(error);
          }
        } catch (e) {
          throw new Error(`Error ${e}`)
        }
      }
    }

    void (async () => {
      await fetchData();
    })();
  }, [selectedLang, modeView, supabaseClient, userId]);

  return teachers;
}

export default useGetTeachers
