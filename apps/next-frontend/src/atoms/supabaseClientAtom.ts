import { atom } from 'jotai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_API_KEY!;

export const supabaseClientAtom = atom<SupabaseClient | null>(null);

export const supabaseClientWriteAtom = atom(
  null,
  (get, set, jwt: string | null) => {
    if (!jwt) {
      set(supabaseClientAtom, null);
      return;
    }

    const options = {
      global: {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    };

    console.log("Creating new Supabase client");
    const newClient = createClient(supabaseUrl, supabaseAnonKey, options);
    set(supabaseClientAtom, newClient);
  }
);
