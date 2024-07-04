import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { isJwtExpiredAtom, supabaseJWTAtom } from '@/atoms/atoms';
import { isJwtExpired } from '@/utils/app';

export const useJwtExpirationCheck = () => {
  const queryClient = useQueryClient();
  const supabaseJWT = useAtomValue(supabaseJWTAtom);
  const setJwtExpiration = useSetAtom(isJwtExpiredAtom);

  return useQuery({
    queryKey: ['jwtExpirationCheck'],
    queryFn: () => {
      if (!supabaseJWT) {
        return false;
      } else if (isJwtExpired(supabaseJWT)) {
        console.log('jwtExpirationCheck: setJwtExpiration(true)');

        setJwtExpiration(true);

        queryClient.invalidateQueries({queryKey:['nonce', 'signature', 'supabaseJWT', 'supabaseClient']});

        return true;
      }
      return false;
    },
    retry: false,
    refetchInterval: 60000, // Check every minute, adjust as needed
  });
};
