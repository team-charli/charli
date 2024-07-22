// useRouting.tsx
import { useIsOnboarded, useIsLitLoggedIn } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useIsSignInRedirectQuery } from './Auth/LitAuth/useIsSignInRedirectQuery';
import { useCheckAndRefreshAuthChain } from "./Auth/useCheckAndRefreshAuthChain";
import { useAuth } from '@/contexts/AuthContext';

export function useRouting() {
  const router = useRouter();
  const auth = useAuth();
  const checkAndRefreshAuthChain = useCheckAndRefreshAuthChain();
  const { data: isOnboarded } = useIsOnboarded();
  const { data: isLitLoggedIn } = useIsLitLoggedIn();
  const { data: isOAuthRedirect } = useIsSignInRedirectQuery();

  return useQuery({
    queryKey: ['authRouting', router.asPath, checkAndRefreshAuthChain.data, isOnboarded, isLitLoggedIn, isOAuthRedirect],
    queryFn: async () => {
      console.log(`Current URL: ${router.asPath} -- from authRouting`);

      if (!auth.isSuccess) {
        console.log('Waiting for initial auth chain to complete');
        return { action: 'waiting', reason: 'authChainIncomplete' };
      }

      if (isOAuthRedirect) {
        console.log('OAuth redirect detected, waiting for auth chain to complete');
        return { action: 'waiting', reason: 'isOAuthRedirect' };
      }

      if (checkAndRefreshAuthChain.data?.status === 'incomplete') {
        if (checkAndRefreshAuthChain.data.requiresOAuth && router.pathname !== '/login') {
          console.log('OAuth login required, redirecting to login');
          await router.push('/login');
          return { action: 'redirected', to: '/login', reason: 'requiresOAuth' };
        } else if (router.pathname !== '/login') {
          console.log(`Auth chain incomplete at step: ${checkAndRefreshAuthChain.data.missingStep}, redirecting to login`);
          await router.push('/login');
          return { action: 'redirected', to: '/login', reason: 'incompleteAuth' };
        }
      }

      if (isLitLoggedIn && isOnboarded === false && router.pathname !== '/onboard') {
        await router.push('/onboard');
        return { action: 'redirected', to: '/onboard' };
      }

      if (isLitLoggedIn && isOnboarded && router.pathname !== '/lounge') {
        await router.push('/lounge');
        return { action: 'redirected', to: '/lounge' };
      }

      if (!isLitLoggedIn && router.pathname !== '/login') {
        await router.push('/login');
        return { action: 'redirected', to: '/login', reason: 'notLoggedIn' };
      }

      console.log(`No navigation needed. Current route: ${router.pathname}`);
      return { action: 'none' };
    },
    enabled: !checkAndRefreshAuthChain.isLoading && checkAndRefreshAuthChain.isSuccess,
  });
}
