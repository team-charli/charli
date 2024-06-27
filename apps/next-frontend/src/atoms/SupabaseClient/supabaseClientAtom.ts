import { atomWithQuery } from 'jotai-tanstack-query';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isJwtExpired } from '@/utils/app';
import { supabaseJWTAtom } from './supabaseJWTAtomQuery';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_API_KEY!;

export const supabaseClientAtom = atomWithQuery((get) => ({
  queryKey: ['supabaseClient', get(supabaseJWTAtom)],
  queryFn: async (): Promise<SupabaseClient | null> => {
    const userJWT = get(supabaseJWTAtom).data;
    if (userJWT && !isJwtExpired(userJWT)) {
      return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${userJWT}` } },
      });
    }
    return null;
  },
  enabled: !!get(supabaseJWTAtom).data,
}));
