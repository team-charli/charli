//useGetLearners.tsx
interface FetchLearnersResponse {
  name: string;
  wants_to_learn_langs: string[];
  id: number;
}
//WIP: mirror  useGetTeachers.tsx
import { UseQueryResult, useQuery } from '@tanstack/react-query';
import useLocalStorage from '@rehooks/local-storage';
import { useSupabaseClient } from '@/contexts/AuthContext';

export interface UserData {
  id: number;
  name: string;
  wants_to_learn_langs: string[];
}

export function useGetLearners(selectedLang: string, modeView: "Learn" | "Teach"): UseQueryResult<UserData[], Error> {
  const [userId] = useLocalStorage<number>("userID");
  const {data: supabaseClient} = useSupabaseClient();

  return useQuery({
    queryKey:  ['getLearners', userId] as const,
    queryFn: async () => {
      if (modeView === 'Teach' && supabaseClient) {
        const { data: user_data, error } = await supabaseClient
          .from('user_data')
          .select('*')
          .contains('wants_to_learn_langs', [selectedLang]);

        if (error) throw error;

        return (user_data as UserData[])
          ?.filter(user => user.id !== userId)
          .map(({ id, name, wants_to_learn_langs }): UserData => ({
            id,
            name,
            wants_to_learn_langs
          }));
      }
      return [];
    },
    enabled: modeView === 'Teach' && !!supabaseClient,
  })
}

export default useGetLearners;
