import React, { useEffect, useState, useContext, createContext } from 'react';
import { useSupabase } from './SupabaseContext';
import useLocalStorage from '@rehooks/local-storage';
import { checkIfNotificationExpired } from '../utils/app';

// Base session data
type Session = {
  request_origin: number | null;
  learner_id: number | null;
  teacher_id: number | null;
  learnerName: string | null;
  teacherName: string | null
  request_time_date: string | null;
  counter_time_date: string | null;
  confirmed_time_date: string | null;
  session_rejected_reason: string | null;
  huddle_room_id: string | null;
  session_id: number | null;
};

type PreSessionStateFlags = {
  isProposed: boolean;
  isAmended: boolean;
  isAccepted: boolean;
  isRejected: boolean;
};

type PostSessionStateFlags = {
  // isStarted: boolean;
  // isEnded: boolean;
  isExpired: boolean;
}

type SessionCategoryFlags = {
  isTeacherToLearner: boolean;
  isLearnerToTeacher: boolean;
};

export type ExtendedSession = Session & SessionCategoryFlags & PreSessionStateFlags & PostSessionStateFlags;

type NotificationContextType = {
  notificationsContextValue: ExtendedSession[];
};

const NotificationContext = createContext<NotificationContextType>({ notificationsContextValue: [] });

export const useNotificationContext = () => useContext(NotificationContext);

// Component
const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const [userId] = useLocalStorage<number>("userID");
  const [notifications, setNotifications] = useState<ExtendedSession[]>([]);

  const fetchUserNames = async (teacherId: number, learnerId: number) => {
    if (supabaseClient && !supabaseLoading) {
      let teacherName = '';
      let learnerName = '';

      if (teacherId !== null) {
        const { data: teacherData, error: teacherError } = await supabaseClient
          .from('user_data')
          .select('name')
          .eq('id', teacherId)
          .single();

        if (!teacherError && teacherData) {
          teacherName = teacherData.name;
        }
      }

      if (learnerId !== null) {
        const { data: learnerData, error: learnerError } = await supabaseClient
          .from('user_data')
          .select('name')
          .eq('id', learnerId)
          .single();

        if (!learnerError && learnerData) {
          learnerName = learnerData.name;
        }
      }

      return { teacherName, learnerName };
    }
  };

  // Helper function to determine the class and state of a session
  const classifySession = (session: Session): Omit<ExtendedSession, keyof Session> => {
    const isTeacherToLearner = session.request_origin === userId && session.teacher_id === userId;

    const isLearnerToTeacher = session.request_origin === userId && session.learner_id === userId;

    const isProposed = !!session.request_time_date && !session.confirmed_time_date && !session.counter_time_date && !session.session_rejected_reason;

    const isAmended = !!session.request_time_date && !!session.counter_time_date && !session.confirmed_time_date && !session.session_rejected_reason;

    const isAccepted = !!session.request_time_date && !!session.confirmed_time_date && !session.session_rejected_reason;

    const isRejected = !!session.request_time_date && !session.confirmed_time_date && !!session.session_rejected_reason;

    const isExpired = session.confirmed_time_date ? checkIfNotificationExpired(session.confirmed_time_date) :
      session.counter_time_date ? checkIfNotificationExpired(session.counter_time_date) :
        session.request_time_date ? checkIfNotificationExpired(session.request_time_date) :
          false; // Default to false if none of the dates are set
    return { isTeacherToLearner, isLearnerToTeacher, isProposed, isAmended, isAccepted, isRejected, isExpired };
  };

  useEffect(() => {
    if (supabaseClient && !supabaseLoading && userId) {
      const mySubscription = supabaseClient
      .channel('realtime:sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
      }, async (payload: any) => {
          const baseSession: Session = payload.data.record;

          if (baseSession.teacher_id !== null && baseSession.learner_id !== null) {
            const fetchUserNamesResult  = await fetchUserNames(baseSession.teacher_id, baseSession.learner_id);

            let teacherName
            let learnerName
            if (!fetchUserNamesResult?.teacherName || !fetchUserNamesResult?.learnerName) {
              throw new Error(`failed to fetch teacherName || learnerName from user_data table`)
            } else {

              teacherName = fetchUserNamesResult.teacherName;
              learnerName = fetchUserNamesResult.learnerName;
            }

            const extendedSession: ExtendedSession = {
              ...baseSession,
              teacherName,
              learnerName,
              ...classifySession(baseSession),
            };

            setNotifications(notifications => [...notifications, extendedSession]);
          }
        })
      .subscribe();

      return () => {
        mySubscription.unsubscribe();
      };
    }
  }, [supabaseClient, userId]);

  return (
    <NotificationContext.Provider value={{ notificationsContextValue: notifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;

