import { createClient } from "@supabase/supabase-js";

if (!import.meta.env.VITE_SUPABASE_PUBLIC_API_KEY) {
  throw new Error('SUPABASE_PUBLIC_API_KEY is not set');
}

export const supabase = createClient("https://onhlhmondvxwwiwnruvo.supabase.co", import.meta.env.VITE_SUPABASE_PUBLIC_API_KEY);

