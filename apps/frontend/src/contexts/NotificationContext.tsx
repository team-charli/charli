import React, { createContext, useContext, useEffect, useState } from 'react';
import { NotificationProviderProps } from '../types/types';
import useLocalStorage from '@rehooks/local-storage';
import { useSupabase } from './SupabaseContext';
import { Database } from '../supabaseTypes';

type Session = Database['public']['Tables']['sessions']['Row'];

const NotificationContext = createContext<{ notifications: Session[] }>({ notifications: [] });

export const useNotificationContext = () => useContext(NotificationContext);

const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { client: supabaseClient } = useSupabase();
  const [userId] = useLocalStorage("userID");
  const [notifications, setNotifications] = useState<Session[]>([]);

  useEffect(() => {
    if (supabaseClient && userId) {
      const mySubscription = supabaseClient
      .channel('realtime:sessions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
          filter: `request_origin=neq.${userId} AND (learner_id=eq.${userId} OR teacher_id=eq.${userId})`,
        },
        (payload: { new: Session }) => { // Explicitly type the payload

          setNotifications(notifications => [...notifications, payload.new]);
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
