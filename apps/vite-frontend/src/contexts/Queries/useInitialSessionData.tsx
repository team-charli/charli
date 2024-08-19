//useInitialNotifications.tsx
import { useQuery } from '@tanstack/react-query';
import useLocalStorage from '@rehooks/local-storage';
import { classifySession } from '../helpers';
import { useSupabaseClient } from '../AuthContext';
import { ExtendedSession } from '@/types/types';

const useInitialSessionData = () => {
  const { data: supabaseClient } = useSupabaseClient();
  const [userId] = useLocalStorage<number>("userID");

  const fetchInitialSessionData = async (): Promise<ExtendedSession[]> => {
    if (!supabaseClient || !userId) {
      throw new Error('Supabase client or userId not available');
    }

    const { data, error } = await supabaseClient
      .from('sessions')
      .select(`
        *,
        teacher:user_data!fk_sessions_teacher_id(name),
        learner:user_data!fk_sessions_learner_id(name)
      `)
      .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`)
      .order('request_time_date', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return data.map((session: any) => ({
      ...session,
      teacherName: session.teacher?.name,
      learnerName: session.learner?.name,
      ...classifySession(session),
    }));
  };

  return useQuery({
    queryKey: ['initialSessionData', userId],
    queryFn: fetchInitialSessionData,
    enabled: !!supabaseClient && !!userId,
    staleTime: Infinity,
  });
};

export default useInitialSessionData;
