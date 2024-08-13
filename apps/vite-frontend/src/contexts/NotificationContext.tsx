import React, { useEffect, useState, useContext, createContext } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { checkIfNotificationExpired } from '../utils/app';
import { ExtendedSession, NotificationContextType, Session } from '../types/types';
import { useSupabaseClient } from './AuthContext';
import { fetchLearnersAndTeachers } from './Queries/fetchLearnersAndTeachers';

const NotificationContext = createContext<NotificationContextType>({ notificationsContextValue: [], showIndicator: false, setShowIndicator: ()=>{} });

export const useNotificationContext = () => useContext(NotificationContext);

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const {data: supabaseClient} = useSupabaseClient();
  if (!supabaseClient) throw new Error('no supabaseClient')

  const [showIndicator, setShowIndicator] = useState<boolean>(false);
  const [userId] = useLocalStorage<number>("userID");
  if (!userId) throw new Error('no userId')
  const [notifications, setNotifications] = useState<ExtendedSession[]>([]);

  useEffect(() => {
    if (showIndicator) alert("Notification Alert Triggered!")
  }, [showIndicator])


  const classifySession = (session: Session): Omit<ExtendedSession, keyof Session> => {
    const isProposed = !!session.request_time_date && !session.confirmed_time_date && !session.counter_time_date && !session.session_rejected_reason;

    const isAmended = !!session.request_time_date && !!session.counter_time_date && !session.confirmed_time_date && !session.session_rejected_reason;

    const isAccepted = !!session.request_time_date && !!session.confirmed_time_date && !session.session_rejected_reason;

    const isRejected = !!session.request_time_date && !session.confirmed_time_date && !!session.session_rejected_reason;

    const isExpired = session.confirmed_time_date ? checkIfNotificationExpired(session.confirmed_time_date) :
      session.counter_time_date ? checkIfNotificationExpired(session.counter_time_date) :
        session.request_time_date ? checkIfNotificationExpired(session.request_time_date) :
          false; // Default to false if none of the dates are set
    return { isProposed, isAmended, isAccepted, isRejected, isExpired };
  };

  useEffect(() => {
    const mySubscription = supabaseClient
    .channel('realtime:public.sessions')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sessions',
    }, (async (payload: any) => {
        console.log("payload", payload);
        const baseSession: Session = payload.new;

        const { teacherName, learnerName } = await fetchLearnersAndTeachers(supabaseClient, baseSession.teacher_id, baseSession.learner_id);

        const extendedSession: ExtendedSession = {
          ...baseSession,
          teacherName,
          learnerName,
          ...classifySession(baseSession),
        };

        setNotifications(notifications => [...notifications, extendedSession]);
      }) as unknown as (payload: any) => void)
    .subscribe();

    return () => {
      void (async () => {
        await  mySubscription.unsubscribe();
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseClient, userId]);

  return (
    <NotificationContext.Provider value={{ notificationsContextValue: notifications, showIndicator, setShowIndicator }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;

