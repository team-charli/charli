import { useEffect, useState } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js';
const supabaseUrl = "https://onhlhmondvxwwiwnruvo.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC_API_KEY || "";

export const useSupabase =  () => {
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [jwt, setJwt] = useState(localStorage.getItem('userJWT'));

// Singleton pattern for Supabase client
let supabaseInstance: SupabaseClient | null = null;
const getSupabaseClient = (jwt: string) => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
    });
  }
  return supabaseInstance;
};
  useEffect(() => {
      if (jwt) {
        console.log(`has jwt`)
        const client = getSupabaseClient(jwt);
        setSupabaseClient(client);
      }
    }, [jwt]);

  const updateJwt = (newToken:string) => {
    localStorage.setItem('userJWT', newToken);
    setJwt(newToken);
  };
return {jwt, updateJwt, supabaseClient}
}


