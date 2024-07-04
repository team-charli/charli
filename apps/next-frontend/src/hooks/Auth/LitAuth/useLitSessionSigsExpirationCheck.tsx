import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { sessionSigsAtom, sessionSigsExpiredAtom } from '@/atoms/atoms';
import { sessionSigsExpired } from '@/utils/app';

export const useLitSessionSigsExpirationCheck = () => {
  const queryClient = useQueryClient();
  const sessionSigs = useAtomValue(sessionSigsAtom);
  const setSessionSigsExpiration = useSetAtom(sessionSigsExpiredAtom);

  return useQuery({
    queryKey: ['jwtExpirationCheck'],
    queryFn: () => {
      if (!sessionSigs)  {
        // Invalidate queries that depend on the JWT
        setSessionSigsExpiration(true);

        queryClient.invalidateQueries({queryKey:['sessionSigs']});
        // Add any other queries that depend on the JWT
        return false
        // throw new Error('JWT expired or not available');
      } else if (sessionSigsExpired(sessionSigs)) {
        return true;
      }
      return false;
    },
    retry: false,
    refetchInterval: 60000, // Check every minute, adjust as needed
  });
};

