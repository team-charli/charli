'use client';

// SessionContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '../types/types';
import { useAtom } from 'jotai';
import { supabaseClientAtom } from '@/atoms/SupabaseClient/supabaseClientAtom';

type SessionContextType = {
  sessionData: Session | null;
};

const SessionContext = createContext<SessionContextType>({ sessionData: null });

export const useSessionContext = () => useContext(SessionContext);

const SessionProvider = ({ children }: { children: React.ReactNode}) => {
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [{ data: supabaseClient }] = useAtom(supabaseClientAtom);

  useEffect(() => {
    if (supabaseClient) {
      const mySubscription = supabaseClient
        .channel('realtime:public.sessions')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `learner_joined_signature IS NOT NULL OR learner_left_signature IS NOT NULL OR teacher_joined_signature IS NOT NULL OR teacher_left_signature IS NOT NULL`,
        // eslint-disable-next-line @typescript-eslint/require-await
        }, (async (payload: any) => {
          const updatedSessionData = payload.new as Session;
          setSessionData(updatedSessionData);
        }) as unknown as (payload: any) => void)
        .subscribe();

      return () => {
        void (async () => {
          await mySubscription.unsubscribe();
        })();
      };
    }
  }, [supabaseClient]);

  return (
    <SessionContext.Provider value={{ sessionData }}>
      {children}
    </SessionContext.Provider>
  );
};

export default SessionProvider;
