import React, { useEffect, useState, createContext } from 'react';
import { useSupabase } from './SupabaseContext';
import useLocalStorage from '@rehooks/local-storage';
import { checkIfNotificationExpired } from '../utils/app';

type ExtendedSession = Session & {
  isTeacherToLearner: boolean;
  isLearnerToTeacher: boolean;
  isProposed: boolean;
  isAmended: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  isExpired: boolean;
};

type Session = {
  request_origin: number;
  learner_id: number;
  teacher_id: number;
  request_time_date: string;
  counter_time_date: string | null;
  confirmed_time_date: string | null;
  session_rejected_reason: string | null;
};

type NotificationContextType = {
  notifications: ExtendedSession[];
};

const NotificationContext = createContext<NotificationContextType>({ notifications: [] });

// Component
const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { client: supabaseClient } = useSupabase();
  const [userId] = useLocalStorage<number>("userID");
  const [notifications, setNotifications] = useState<ExtendedSession[]>([]);

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
    if (supabaseClient && userId) {
      const mySubscription = supabaseClient
        .channel('realtime:sessions')
        .on( 'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sessions',
          },
        (payload: any) => {
          const baseSession: Session = payload.new;
          const classification = classifySession(baseSession);

          const extendedSession: ExtendedSession = {
            ...baseSession,
            ...classification
          };
            setNotifications(notifications => [...notifications, extendedSession]);
        }
      )
      .subscribe();

      return () => {
        mySubscription.unsubscribe();
      };
    }
  }, [supabaseClient, userId]);

  return (
    <NotificationContext.Provider value={{ notifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;

