//useInitialNotifications.tsx
import { useQuery } from '@tanstack/react-query';
import useLocalStorage from '@rehooks/local-storage';
import { classifySession } from '../helpers';
import { useSupabaseClient } from '../AuthContext';
import { ExtendedSession, Session } from '@/types/types';

const useInitialSessionData = () => {
  const { data: supabaseClient } = useSupabaseClient();
  const [userId] = useLocalStorage<number>("userID");

  const fetchInitialSessionData = async (): Promise<ExtendedSession[]> => {
    if (!supabaseClient || !userId) {
      throw new Error('Supabase client or userId not available');
    }

    // Fetch sessions
    const { data: sessionsData, error: sessionsError } = await supabaseClient
      .from('sessions')
      .select('*')
      .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`)
      .order('request_time_date', { ascending: false })
      .limit(100);

    if (sessionsError) {
      throw sessionsError;
    }

    // Extract unique user IDs
    // 2) Extract unique user IDs, filtering out null
    const userIds = new Set(
      sessionsData
        .flatMap(session => [session.teacher_id, session.learner_id])
        .filter((id): id is number => id != null)
    );

    // Fetch user names
    const { data: userData, error: userError } = await supabaseClient
      .from('user_data')
      .select('id, name')
      .in('id', Array.from(userIds));

    if (userError) {
      throw userError;
    }

    // Create a map of user IDs to names
    const userNameMap = Object.fromEntries(userData.map(user => [user.id, user.name]));

    // Combine session data with user names and classify sessions
    return sessionsData.map((session: Session) => ({
      ...session,
      teacherName: userNameMap[session.teacher_id] || 'Unknown Teacher',
      learnerName: userNameMap[session.learner_id] || 'Unknown Learner',
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
