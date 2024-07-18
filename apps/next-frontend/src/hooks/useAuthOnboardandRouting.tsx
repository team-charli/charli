import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useAtomValue } from 'jotai';
import { isOAuthRedirectAtom, litAccountAtom, supabaseJWTAtom } from '@/atoms/atoms';
import { useAuthChainManager } from './Auth/useAuthChainManager';
import { useAuth, useIsLitLoggedIn, useIsOnboarded, useJwt, useLitAuthMethod, useLitNodeClientReady } from '@/contexts/AuthContext';

export const useAuthOnboardAndRouting = () => {
  const router = useRouter();
  const { queries, isLoading, isSuccess } = useAuth()
  const isLitLoggedIn = useIsLitLoggedIn();
  const  isOnboarded = useIsOnboarded();
  const litNodeClientReady = useLitNodeClientReady();

  const authMethod = useLitAuthMethod();
  const jwt = useJwt();

  const isOAuthRedirect = useAtomValue(isOAuthRedirectAtom);
  const litAccount = useAtomValue(litAccountAtom);

  const { checkAndInvalidate } = useAuthChainManager();

  const getTargetRoute = () => {
    if (typeof window === 'undefined') return { route: null, reason: 'SSR' };

    if (isLoading) return { route: null, reason: `isLoading: ${isLoading}, Queries: ${queries.filter(q => q.query.isLoading).map(q => q.name).join(', ')}` };

    if (!isSuccess) return { route: null, reason: `isSuccess: ${isSuccess}, Failed Queries: ${queries.filter(q => q.query.isError).map(q => q.name).join(', ')}` };

    if (isOAuthRedirect) return { route: null, reason: `isOAuthRedirect: ${isOAuthRedirect}` };


    if (isLitLoggedIn && isOnboarded === false) return { route: '/onboard', reason: `isLitLoggedIn: ${isLitLoggedIn}, isOnboarded: ${isOnboarded}` };

    if (isLitLoggedIn && isOnboarded) return { route: '/lounge', reason: `isLitLoggedIn: ${isLitLoggedIn}, isOnboarded: ${isOnboarded}` };

    if (!isLitLoggedIn) return { route: '/login', reason: `isLitLoggedIn: ${isLitLoggedIn}` };

    return { route: null, reason: 'Unexpected state' };
  };

  useQuery({
    queryKey: ['authRouting', isLoading, isSuccess, isOAuthRedirect],
    queryFn: async () => {
      const authChainResult = await checkAndInvalidate();
      if (authChainResult === 'redirect_to_login' && router.pathname !== '/login') {
        console.log('Auth chain check requires reauth, redirecting to login');
        router.push('/login');
        return null;
      }
      const { route, reason } = getTargetRoute();
      console.log(`Target Route: ${route}, Reason: ${reason}`);
      if (route && router.pathname !== route) {
        console.log(`Navigating to: ${route}`);
        router.push(route);
      }
      return null;
    },
    enabled: true,
  });

  return null;
};
