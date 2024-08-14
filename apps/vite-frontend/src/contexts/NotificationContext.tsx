import React, { useEffect, useState, useContext, createContext } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { ExtendedSession, NotificationContextType, Session } from '../types/types';
import { useSupabaseClient } from './AuthContext';
import { fetchLearnersAndTeachers } from './Queries/fetchLearnersAndTeachers';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { classifySession } from './helpers';
import useInitialNotifications from './Queries/useInitialNotifications';

const NotificationContext = createContext<NotificationContextType>({ notificationsContextValue: [], showIndicator: false, setShowIndicator: ()=>{} });
const [userId] = useLocalStorage<number>("userID");

export const useNotificationContext = () => useContext(NotificationContext);

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const {data: supabaseClient} = useSupabaseClient();

  const [showIndicator, setShowIndicator] = useState<boolean>(false);
    const { data: initialNotifications } = useInitialNotifications();

  const [notifications, setNotifications] = useState<ExtendedSession[]>([]);

  useEffect(() => {
    if (initialNotifications) {
      setNotifications(initialNotifications);
    }
  }, [initialNotifications]);


  useEffect(() => {
    if (supabaseClient) {
      const mySubscription = supabaseClient
      .channel('realtime:public.sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `teacher_id=eq.${userId},learner_id=eq.${userId}`,
        },
        async (payload: RealtimePostgresChangesPayload<Session> | null) => {
          try {
            if (payload === null) {
              console.error('Received null payload');
              return;
            }

            if (payload.eventType === 'DELETE') {
              setNotifications(notifications =>
                notifications.filter(n => n.session_id !== payload.old.session_id)
              );
              return;
            }

            if (!payload.new) {
              console.error('Unexpected payload structure:', payload);
              return;
            }

            const baseSession: Session = payload.new;
            const { teacherName, learnerName } = await fetchLearnersAndTeachers(supabaseClient, baseSession.teacher_id, baseSession.learner_id);
            const extendedSession: ExtendedSession = {
              ...baseSession,
              teacherName,
              learnerName,
              ...classifySession(baseSession),
            };
            setNotifications(notifications => [...notifications, extendedSession]);
          } catch (error) {
            console.error('Error processing realtime update:', error);
            // Optionally, you could update some error state here
            // setError('Failed to process realtime update');
          }
        }
      )
      .subscribe();

      return () => {
        void (async () => {
          try {
            await mySubscription.unsubscribe();
          } catch (error) {
            console.error('Error unsubscribing from channel:', error);
          }
        })();
      };
    }
  }, [supabaseClient, userId]);

  useEffect(() => {
    if (showIndicator) alert("Notification Alert Triggered!")
  }, [showIndicator])

  useEffect(() => {
    console.log('notifications', notifications)
  }, [notifications])

  return (
    <NotificationContext.Provider value={{ notificationsContextValue: notifications, showIndicator, setShowIndicator }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;

