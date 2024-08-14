import { useQuery } from '@tanstack/react-query';
import useLocalStorage from '@rehooks/local-storage';
import { classifySession } from '../helpers';
import { useSupabaseClient } from '../AuthContext';
import { ExtendedSession } from '@/types/types';

const useInitialNotifications = () => {
  const { data: supabaseClient } = useSupabaseClient();
  const [userId] = useLocalStorage<number>("userID");

  const fetchNotifications = async (): Promise<ExtendedSession[]> => {
    if (!supabaseClient || !userId) {
      throw new Error('Supabase client or userId not available');
    }

    const { data, error } = await supabaseClient
      .from('sessions')
      .select(`
        *,
        teacher:teacher_id(name),
        learner:learner_id(name)
      `)
      .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`)
      .order('request_time_date', { ascending: false });

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
    queryKey: ['initialNotifications', userId],
    queryFn: fetchNotifications,
    enabled: !!supabaseClient && !!userId,
    staleTime: Infinity, // This ensures the query won't refetch unnecessarily
  });
};


export default useInitialNotifications;

