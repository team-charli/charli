import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useFetchJWT } from '../hooks/Supabase/useFetchJWT'; // adjust the path as necessary
import { SupabaseProviderProps } from '../types/types';

const SupabaseContext = createContext<{ client: SupabaseClient | null, isLoading: boolean }>({ client: null, isLoading: true });

const createSupabaseClient = (jwt: string): SupabaseClient => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC_API_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
};

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  const { loading: jwtLoading, error: jwtError } = useFetchJWT();
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    const jwt = localStorage.getItem('userJWT');
    if (jwt && !supabaseClient) {
      const client = createSupabaseClient(jwt);
      setSupabaseClient(client);
    }
  }, [jwtLoading]); // Depend on the JWT loading state

  const isLoading = jwtLoading || !supabaseClient;

  return (
    <SupabaseContext.Provider value={{ client: supabaseClient, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export default SupabaseProvider;
