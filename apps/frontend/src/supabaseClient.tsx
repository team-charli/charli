import 'dotenv/config'
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_PUBLIC_API_KEY) {
  throw new Error('SUPABASE_PUBLIC_API_KEY is not set');
}

export const supabase = createClient("https://onhlhmondvxwwiwnruvo.supabase.co", process.env.SUPABASE_PUBLIC_API_KEY);

