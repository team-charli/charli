import { useEffect, useState } from "react";
import { useSupabase } from "../../contexts/SupabaseContext";
import useLocalStorage from "@rehooks/local-storage";

interface FetchLearnersResponse {
  name: string;
  wants_to_learn_langs: string[];
  id: number;
}

function useGetLearners(selectedLang: string, modeView: "Learn" | "Teach") {
  const [userId] = useLocalStorage<number>("userID");
  const {client: supabaseClient, supabaseLoading } = useSupabase();
  const [learners, setLearners] = useState<FetchLearnersResponse[] | null> ([]);

  useEffect(() => {
    async function fetchData() {
      if (modeView === 'Teach') {
        try {
          if (supabaseClient && !supabaseLoading  ) {
            console.log("run useGetLearners");

            const {data: user_data, error} =  await supabaseClient
              .from('user_data')
              .select('*')
              .contains('wants_to_learn_langs', [selectedLang]);
            if (error) {
              console.log(error)
            }
            // console.log('learners user_data', user_data)
            // console.log('selectedLang', selectedLang)
            setLearners(user_data?.filter(user => user.id !== userId) as FetchLearnersResponse[]);
          }
        } catch (e) {
          throw new Error(`Error ${e}`)
        }
      }
    }
    void (async () => {
      await fetchData();
    })();
  }, [selectedLang, modeView, supabaseClient, supabaseLoading, userId]);

  return learners;
}

export default useGetLearners

