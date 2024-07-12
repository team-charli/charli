import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useAtomValue } from 'jotai';
import { isOnboardedAtom, isLitLoggedInAtom, isOAuthRedirectAtom } from '@/atoms/atoms';
import { useInitQueries } from './Auth/useInitQueries';
import { useAuthChainManager } from './Auth/useAuthChainManager';

export const useAuthOnboardAndRouting = () => {
  const router = useRouter();
  const { isLoading, isSuccess, authMethodQuery } = useInitQueries();
  const isOnboarded = useAtomValue(isOnboardedAtom);
  const isLitLoggedIn = useAtomValue(isLitLoggedInAtom);
  const isOAuthRedirect = useAtomValue(isOAuthRedirectAtom);
  const { checkAndInvalidate } = useAuthChainManager();

  const getTargetRoute = () => {
    if (typeof window === 'undefined') return { route: null, reason: 'SSR' };
    if (isLoading) return { route: null, reason: `isLoading: ${isLoading}` };
    if (!isSuccess) return { route: null, reason: `isSuccess: ${isSuccess}` };
    if (isOAuthRedirect) return { route: null, reason: `isOAuthRedirect: ${isOAuthRedirect}` };
    if (isLitLoggedIn && isOnboarded === false) return { route: '/onboard', reason: `isLitLoggedIn: ${isLitLoggedIn}, isOnboarded: ${isOnboarded}` };
    if (isLitLoggedIn && isOnboarded) return { route: '/lounge', reason: `isLitLoggedIn: ${isLitLoggedIn}, isOnboarded: ${isOnboarded}` };
    if (!isLitLoggedIn) return { route: '/login', reason: `isLitLoggedIn: ${isLitLoggedIn}` };
    return { route: null, reason: 'Unexpected state' };
  };

  useQuery({
    queryKey: ['authRouting', isLitLoggedIn, isOnboarded, isOAuthRedirect, isLoading, isSuccess],
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
