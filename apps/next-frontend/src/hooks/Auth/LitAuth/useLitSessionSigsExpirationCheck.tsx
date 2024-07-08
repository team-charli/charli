import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { sessionSigsAtom, sessionSigsExpiredAtom } from '@/atoms/atoms';
import { sessionSigsExpired } from '@/utils/app';

export const useLitSessionSigsExpirationCheck = () => {
  const queryClient = useQueryClient();
  const sessionSigs = useAtomValue(sessionSigsAtom);
  const setSessionSigsExpiration = useSetAtom(sessionSigsExpiredAtom);
  const sessionSigsExist = !!sessionSigs;
  return useQuery({
    queryKey: ['sessionSigsExpirationCheck', sessionSigsExist],

    queryFn: () => {

      console.log('Checking session sigs expiration');

      if (!sessionSigs) {

        console.log('No sessionSigs available');

        setSessionSigsExpiration(false);

        queryClient.refetchQueries({queryKey:['litSession', 'pkpWallet']});

        return { status: 'missing' as const };
      }
      const isExpired = sessionSigsExpired(sessionSigs);

      // console.log(`sessionSigsExpired returned: ${isExpired}`);

      if (isExpired) {

        setSessionSigsExpiration(true);

        queryClient.refetchQueries({queryKey:['litSession', 'pkpWallet']});

        console.log('sessionSigs -- expired, refetching');

        return { status: 'expired' as const };
      }
      setSessionSigsExpiration(false);

      // console.log('sessionSigs -- valid');

      return { status: 'valid' as const };
    },
    retry: false,
    refetchInterval: 60000,
  });
};
