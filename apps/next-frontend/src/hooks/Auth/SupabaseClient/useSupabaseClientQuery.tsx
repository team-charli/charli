// useSupabaseClient hook
import { supabaseClientAtom, supabaseClientWriteAtom } from '@/atoms/supabaseClientAtom';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';

interface SupabaseClientQueryParams {
  queryKey: [string, string],
  enabledDeps: boolean,
  queryFnData: [string]
}

export const useSupabaseClientQuery = ({queryKey, enabledDeps, queryFnData}: SupabaseClientQueryParams ) => {
  const supabaseClient = useAtomValue(supabaseClientAtom);
  const setSupabaseClient = useSetAtom(supabaseClientWriteAtom);
  const [userJWT] = queryFnData;
  // console.log('enabledDeps', enabledDeps)

  return useQuery({
    queryKey,
    queryFn: () => {
      if (!userJWT || !!userJWT.length) {
        console.log("No JWT available, returning null");
        setSupabaseClient(null);
        return null;
      }
      console.log("8a: start supabaseClientQuery");

      setSupabaseClient(userJWT);
      console.log("8b: finish supabaseClientQuery");

      return supabaseClient;
    },
    enabled: enabledDeps,
    // staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
};
