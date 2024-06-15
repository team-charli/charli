// supabaseClientSingleton.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseClientSingleton = (() => {
  let instance: SupabaseClient | null = null;
  let currentJwt: string | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("can't find supabaseUrl and/or supabaseAnonKey");
  }

  const createInstance = (jwt: string) => {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    return client;
  };

  return {
    getSupabaseClient: (jwt: string) => {
      if (jwt !== currentJwt) {
        instance = createInstance(jwt);
        currentJwt = jwt;
      }
      return instance;
    },
  };
})();

export default supabaseClientSingleton;
