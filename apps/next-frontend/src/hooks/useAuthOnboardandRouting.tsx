// useAuthOnboardAndRouting.ts
import { useRouter } from 'next/router';
import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { isOnboardedAtom, isLitLoggedInAtom, onboardModeAtom, isLoadingAtom, isOAuthRedirectAtom } from '@/atoms/atoms';
import { isSignInRedirect } from '@lit-protocol/lit-auth-client';
import { useInitQueries } from './Auth/useInitQueries';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useAuthOnboardAndRouting = () => {

  const router = useRouter();
  useInitQueries();

  const [isOnboarded] = useAtom(isOnboardedAtom);
  const [isLitLoggedIn] = useAtom(isLitLoggedInAtom);
  const [onboardMode] = useAtom(onboardModeAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [isOAuthRedirect, setIsOAuthRedirect] = useAtom(isOAuthRedirectAtom);

  useEffect(() => {
    setIsOAuthRedirect(isSignInRedirect(redirectUri));
  }, [setIsOAuthRedirect]);


  const getTargetRoute = useCallback(() => {
    if (typeof window === 'undefined' || isLoading || isOAuthRedirect) {
      return null;
    }

    if (!isLitLoggedIn && !isOnboarded) {
      return '/login';
    }

    if (isLitLoggedIn && isOnboarded) {
      return '/lounge';
    }

    if (!isLitLoggedIn && isOnboarded) {
      return '/login';
    }

    if (onboardMode === 'Teach' || onboardMode === 'Learn') {
      return '/login';
    }

    return '/';
  }, [isLoading, isOAuthRedirect, isLitLoggedIn, isOnboarded, onboardMode]);

  useEffect(() => {
    const route = getTargetRoute();
    if (route && router.pathname !== route) {
      router.push(route).catch(e => console.error(`Error routing to ${route}:`, e));
    }
  }, [getTargetRoute, router]);
};
