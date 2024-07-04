// useSupabaseClient hook
import { supabaseJWTAtom } from '@/atoms/atoms';
import { supabaseClientAtom, supabaseClientWriteAtom } from '@/atoms/supabaseClientAtom';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';

export const useSupabaseClient = () => {
  const userJWT = useAtomValue(supabaseJWTAtom);
  const supabaseClient = useAtomValue(supabaseClientAtom);
  const setSupabaseClient = useSetAtom(supabaseClientWriteAtom);

  return useQuery({

    queryKey: ['supabaseClient'],
    queryFn: () => {
      console.log("8a: start supabaseClientQuery");
      if (!userJWT) {
        console.log("No JWT available, returning null");
        setSupabaseClient(null);
        return null;
      }

      setSupabaseClient(userJWT);
      console.log("8b: finish supabaseClientQuery");

      return supabaseClient;
    },
    enabled: !!userJWT,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
};
