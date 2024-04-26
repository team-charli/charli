// SessionContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSupabase } from './SupabaseContext';
import { Session } from '../types/types';

type SessionContextType = {
  sessionData: Session | null;
};

const SessionContext = createContext<SessionContextType>({ sessionData: null });

export const useSessionContext = () => useContext(SessionContext);

const SessionProvider = ({ children }: { children: React.ReactNode}) => {
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const { client: supabaseClient, supabaseLoading } = useSupabase();

  useEffect(() => {
    if (supabaseClient && !supabaseLoading) {
      const mySubscription = supabaseClient
        .channel('realtime:public.sessions')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `learner_joined_signature IS NOT NULL OR learner_left_signature IS NOT NULL OR teacher_joined_signature IS NOT NULL OR teacher_left_signature IS NOT NULL`,
        }, async (payload: any) => {
          const updatedSessionData = payload.new as Session;
          setSessionData(updatedSessionData);
        })
        .subscribe();

      return () => {
        mySubscription.unsubscribe();
      };
    }
  }, [supabaseClient, supabaseLoading]);

  return (
    <SessionContext.Provider value={{ sessionData }}>
      {children}
    </SessionContext.Provider>
  );
};

export default SessionProvider;
