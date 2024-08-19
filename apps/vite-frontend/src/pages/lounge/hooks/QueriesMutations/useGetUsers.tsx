// useGetUsers.tsx
import { UseQueryResult, useQuery } from '@tanstack/react-query';
import useLocalStorage from '@rehooks/local-storage';
import { useSupabaseClient } from '@/contexts/AuthContext';

export interface UserData {
  id: number;
  name: string;
  wants_to_learn_langs?: number[];
  wants_to_teach_langs?: number[];
}

export function useGetUsers(selectedLang: string, modeView: "Learn" | "Teach"): UseQueryResult<UserData[], Error> {
  const [userId] = useLocalStorage<number>("userID");
  const {data: supabaseClient} = useSupabaseClient();

  return useQuery({
    queryKey: ['getUsers', userId, selectedLang, modeView] as const,
    queryFn: async () => {
      if (!supabaseClient) throw new Error(`supabaseClient is undefined`);

      // First, get the language ID for the selected language
      const { data: languageData, error: languageError } = await supabaseClient
        .from('languages')
        .select('id')
        .eq('name', selectedLang)
        .single();

      if (languageError) throw languageError;
      if (!languageData) throw new Error(`Language not found: ${selectedLang}`);

      const languageId = languageData.id;

      const column = modeView === 'Learn' ? 'wants_to_teach_langs' : 'wants_to_learn_langs';

      const { data: user_data, error } = await supabaseClient
        .from('user_data')
        .select('*')
        .contains(column, [languageId]);

      if (error) throw error;

      return (user_data as UserData[])
        ?.filter(user => user.id !== userId)
        .map(({ id, name, wants_to_learn_langs, wants_to_teach_langs }): UserData => ({
          id,
          name,
          ...(modeView === 'Learn' ? { wants_to_teach_langs } : { wants_to_learn_langs })
        }));
    },
    enabled: !!supabaseClient && !!selectedLang && !!modeView,
  });
}

export default useGetUsers;
