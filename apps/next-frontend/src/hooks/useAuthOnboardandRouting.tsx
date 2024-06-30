// useAuthOnboardRouting.ts
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { isOnboardedAtom, isLitLoggedInAtom, onboardModeAtom } from '@/atoms/atoms';
import { useAuthQueries } from './useAuthQueries';
import { isSignInRedirect } from '@lit-protocol/lit-auth-client';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useAuthOnboardRouting = () => {
  const router = useRouter();
  const { isLoading } = useAuthQueries();
  const [isOnboarded] = useAtom(isOnboardedAtom);
  const [isLitLoggedIn] = useAtom(isLitLoggedInAtom);
  const [onboardMode] = useAtom(onboardModeAtom);

  const isOAuthRedirect = isSignInRedirect(redirectUri);

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

  const route = getTargetRoute();
  if (route && router.pathname !== route) {
    router.push(route).catch(e => console.error(`Error routing to ${route}:`, e));
  }

  return {
    isLoading,
    isLitLoggedIn,
    isOnboarded,
    onboardMode,
    isOAuthRedirect
  };
};
