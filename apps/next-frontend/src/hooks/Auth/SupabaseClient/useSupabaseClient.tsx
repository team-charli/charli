import { supabaseJWTAtom } from '@/atoms/atoms';
import { supabaseClientAtom, supabaseClientWriteAtom } from '@/atoms/supabaseClientAtom';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { SupabaseClient } from '@supabase/supabase-js';

export const useSupabaseClient = () => {
  const userJWT = useAtomValue(supabaseJWTAtom);
  const setSupabaseClient = useSetAtom(supabaseClientWriteAtom);
  const store = useStore();

  return useQuery<SupabaseClient | null, Error>({
    queryKey: ['supabaseClient', userJWT],
    queryFn: () => {
      console.log("8a: start supabaseClientQuery");
      if (!userJWT) {
        console.log("No JWT available, returning null");
        setSupabaseClient(null);
        return null;
      }

      setSupabaseClient(userJWT);

      // Use the store to read the atom value
      const newClient = store.get(supabaseClientAtom);

      console.log("8b: finish supabaseClientQuery", newClient);
      return newClient;
    },
    enabled: !!userJWT,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
};
