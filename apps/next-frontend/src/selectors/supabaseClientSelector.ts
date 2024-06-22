import { selector } from 'recoil';
import { userJWTAtom } from '@/atoms/atoms';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { isJwtExpired } from '../utils/app';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_API_KEY!;

export const supabaseClientSelector = selector<SupabaseClient | null>({
  key: 'supabaseClientSelector',
  get: ({ get }) => {
    const userJWT = get(userJWTAtom);
    if (userJWT && !isJwtExpired(userJWT)) {
      return createClient(supabaseUrl!, supabaseAnonKey!, {
        global: { headers: { Authorization: `Bearer ${userJWT}` } },
      });
    }
    return null;
  },
});

