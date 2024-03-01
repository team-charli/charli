import React, { useEffect, useState, useContext, createContext } from 'react';
import { useSupabase } from './SupabaseContext';
import useLocalStorage from '@rehooks/local-storage';
import { checkIfNotificationExpired } from '../utils/app';
import { ExtendedSession, NotificationContextType, Session } from '../types/types';

const NotificationContext = createContext<NotificationContextType>({ notificationsContextValue: [], showIndicator: false, setShowIndicator: ()=>{} });

export const useNotificationContext = () => useContext(NotificationContext);

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [showIndicator, setShowIndicator] = useState<boolean>(false);
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const [userId] = useLocalStorage<number>("userID");
  const [notifications, setNotifications] = useState<ExtendedSession[]>([]);

  useEffect(() => {
    if (showIndicator) alert("Notification Alert Triggered!")
  }, [showIndicator])

  const fetchLearnersAndTeachers = async (teacherId: number, learnerId: number) => {
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
    //FIX: not returning data on update
    if (supabaseClient && !supabaseLoading && userId) {
      const mySubscription = supabaseClient
      .channel('realtime:public.sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
      }, async (payload: any) => {
          console.log("payload", payload)
          const baseSession: Session = payload.new;
          if (baseSession.teacher_id !== null && baseSession.learner_id !== null) {
            const fetchUserNamesResult  = await fetchLearnersAndTeachers(baseSession.teacher_id, baseSession.learner_id);

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
  }, [supabaseClient, supabaseLoading, userId]);

  return (
    <NotificationContext.Provider value={{ notificationsContextValue: notifications, showIndicator, setShowIndicator }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;

