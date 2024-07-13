import useLocalStorage from "@rehooks/local-storage";
import { useAtomValue } from "jotai";
import { supabaseClientAtom } from "@/atoms/supabaseClientAtom";
import { UseQueryResult } from "@tanstack/react-query";
import { useSupabaseQuery } from "@/hooks/Supabase/useSupabaseQuery";

interface UserData {
  id: number;
  name: string;
  wants_to_teach_langs: string[];
  // Add other fields as needed
}

export function useGetTeachers(selectedLang: string, modeView: "Learn" | "Teach"):  UseQueryResult<UserData[], Error> {
  const [userId] = useLocalStorage<number>("userID");
  const supabaseClient = useAtomValue(supabaseClientAtom);

  return useSupabaseQuery(
    ['getTeachers', userId] as const,
    async (supabaseClient) => {

      if (modeView === 'Learn') {
        const {data: user_data, error} =  await supabaseClient
          .from('user_data')
          .select('*')
          .contains('wants_to_teach_langs', [selectedLang]);
        if (error) throw error;

        return (user_data as UserData[])

          ?.filter(user => user.id !== userId)  .map(({ id, name, wants_to_teach_langs }):UserData  => ({
            id,
            name,
            wants_to_teach_langs
          }));
      }
      return [];
    },
    {
      enabled: modeView === 'Learn' && !!supabaseClient,
    }
  )
}

export default useGetTeachers
