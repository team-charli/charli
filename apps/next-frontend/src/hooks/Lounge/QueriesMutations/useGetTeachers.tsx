import { useSupabaseClient } from "@/contexts/AuthContext";
import useLocalStorage from "@rehooks/local-storage";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

interface UserData {
  id: number;
  name: string;
  wants_to_teach_langs: string[];
  // Add other fields as needed
}

export function useGetTeachers(selectedLang: string, modeView: "Learn" | "Teach"):  UseQueryResult<UserData[], Error> {
  const {data: supabaseClient} = useSupabaseClient();
  const [userId] = useLocalStorage<number>("userID");

  return  useQuery({
    queryKey: ['getTeachers', userId] as const,
    queryFn: async () => {
      if (!supabaseClient) throw new Error(`supabaseClient is undefined`)
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

    enabled: modeView === 'Learn' && !!supabaseClient,
  })
}

export default useGetTeachers
