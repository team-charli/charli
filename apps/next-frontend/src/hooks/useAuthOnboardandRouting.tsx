import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useAtomValue } from 'jotai';
import { isOAuthRedirectAtom, litAccountAtom, supabaseJWTAtom } from '@/atoms/atoms';
import { useAuthChainManager } from './Auth/useAuthChainManager';
import { useAuthChain } from './Auth/useAuthChain';
import { useIsLitLoggedIn } from './Auth/LitAuth/useIsLitLoggedIn';
import { useIsOnboarded, useLitAuthMethodQuery, useLitNodeClientReadyQuery } from './Auth';

export const useAuthOnboardAndRouting = () => {
  const router = useRouter();
  const { queries, isLoading, isSuccess } = useAuthChain();
  const isOAuthRedirect = useAtomValue(isOAuthRedirectAtom);
  const {data: isLitLoggedIn } = useIsLitLoggedIn();
  const {data: isOnboarded} = useIsOnboarded();
  const {data: litNodeClientReady} = useLitNodeClientReadyQuery();
  const {data: authMethod} = useLitAuthMethodQuery();
  const litAccount = useAtomValue(litAccountAtom);
  const jwt = useAtomValue(supabaseJWTAtom);
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
      const authChainResult = await checkAndInvalidate(litNodeClientReady, authMethod, litAccount, jwt  );
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
