import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { supabaseJWTAtom } from '@/atoms/atoms';
import { isJwtExpired } from '@/utils/app';

export const useJwtExpirationCheck = () => {
  const queryClient = useQueryClient();
  const supabaseJWT = useAtomValue(supabaseJWTAtom);

  return useQuery({
    queryKey: ['jwtExpirationCheck'],
    queryFn: () => {
      if (!supabaseJWT || isJwtExpired(supabaseJWT)) {
        // Invalidate queries that depend on the JWT
        queryClient.invalidateQueries({queryKey:['supabaseClient']});
        // Add any other queries that depend on the JWT

        throw new Error('JWT expired or not available');
      }
      return true;
    },
    retry: false,
    refetchInterval: 60000, // Check every minute, adjust as needed
  });
};
