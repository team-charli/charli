import React, { useEffect, useState, useContext, createContext } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { ExtendedSession, Session, SessionsContextType } from '../types/types';
import { useSupabaseClient } from './AuthContext';
import { fetchLearnersAndTeachers } from './Queries/fetchLearnersAndTeachers';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { classifySession } from './helpers';
import useInitialSessionData from './Queries/useInitialSessionData';

const SessionsContext = createContext<SessionsContextType>({
  sessionsContextValue: [],
  showIndicator: false,
  setShowIndicator: ()=>{}
});

export const useSessionsContext = () => useContext(SessionsContext);

const SessionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId] = useLocalStorage<number>("userID");
  const {data: supabaseClient, isLoading, isError} = useSupabaseClient();

  const [showIndicator, setShowIndicator] = useState<boolean>(false);
  const { data: initialSessionData } = useInitialSessionData();

  const [sessionData, setSessionData] = useState<ExtendedSession[]>([]);

  useEffect(() => {
    if (initialSessionData) {
      setSessionData(initialSessionData);
    }
  }, [initialSessionData]);


  useEffect(() => {
    if (supabaseClient) {

      const subscription = supabaseClient
      .channel('realtime:public.sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `teacher_id=eq.${userId}`,
        },
        handlePayload
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `learner_id=eq.${userId}`,
        },
        handlePayload
      )
      .subscribe((status) => {
      });

      async function handlePayload(payload: RealtimePostgresChangesPayload<Session> | null) {
        try {
          if (payload === null) {
            console.error('Received null payload');
            return;
          }
          if (payload.eventType === 'DELETE') {
            setSessionData(sessions =>
              sessions.filter(s => s.session_id !== payload.old.session_id)
            );
            return;
          }
          if (!payload.new) {
            console.error('Unexpected payload structure:', payload);
            return;
          }
          const baseSession: Session = payload.new;
          const { teacherName, learnerName } = await fetchLearnersAndTeachers(supabaseClient, baseSession);
          const extendedSession: ExtendedSession = {
            ...baseSession,
            teacherName,
            learnerName,
            ...classifySession(baseSession),
          };
          setSessionData(sessions => {
            const existingIndex = sessions.findIndex(s => s.session_id === extendedSession.session_id);
            if (existingIndex !== -1) {
              // Update existing session
              const updatedSessions = [...sessions];
              updatedSessions[existingIndex] = extendedSession;
              return updatedSessions;
            } else {
              // Add new session
              return [...sessions, extendedSession];
            }
          });
        } catch (error) {
          console.error('Error processing realtime update:', error);
          // setError('Failed to process realtime update');
        }
      }


      return () => {
        void (async () => {
          try {
            await subscription.unsubscribe();
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


  return (
    <SessionsContext.Provider value={{ sessionsContextValue: sessionData, showIndicator, setShowIndicator }}>
      {children}
    </SessionsContext.Provider>
  );
};

export default SessionsProvider;

