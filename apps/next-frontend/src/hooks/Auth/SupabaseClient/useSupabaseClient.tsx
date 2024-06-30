// useSupabaseClient.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isJwtExpired } from '@/utils/app';
import { supabaseJWTAtom, supabaseClientAtom } from '@/atoms/atoms';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_API_KEY!;

export const useSupabaseClient = () => {
  const userJWT = useAtomValue(supabaseJWTAtom);
  const setSupabaseClient = useSetAtom(supabaseClientAtom);

  return useQuery({
    queryKey: ['supabaseClient', userJWT],
    queryFn: async (): Promise<SupabaseClient | null> => {
      if (userJWT && !isJwtExpired(userJWT)) {
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${userJWT}` } },
        });
        setSupabaseClient(client);
        return client;
      }
      return null;
    },
    enabled: !!userJWT,
  });
};
