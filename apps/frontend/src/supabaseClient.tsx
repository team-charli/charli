import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://onhlhmondvxwwiwnruvo.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC_API_KEY;

const userJWT = localStorage.getItem('userJWT');

const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    session: userJWT ? { Authorization: `Bearer ${userJWT}` } : undefined,
  }
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey, options );

