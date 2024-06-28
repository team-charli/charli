'use client';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo } from 'react';
import { AuthOnboardContextObj } from '@/types/types';
import { useAtom } from 'jotai';
import {
  authenticateAtom, fetchLitAccountsAtom, litSessionAtom,
  isOnboardedAtom, isLitLoggedInAtom, onboardModeAtom,
  litNodeClientReadyAtom
} from '@/atoms/index'

export const useAuthOnboardRouting = (): AuthOnboardContextObj => {
  const router = useRouter();
  const [{ isLoading: authLoading }] = useAtom(authenticateAtom);
  const [{ isLoading: accountsLoading }] = useAtom(fetchLitAccountsAtom);
  const [{ isLoading: sessionSigsLoading }] = useAtom(litSessionAtom);
  const [isOnboarded] = useAtom(isOnboardedAtom);
  const [isLitLoggedIn] = useAtom(isLitLoggedInAtom);
  const [onboardMode] = useAtom(onboardModeAtom);
  const [{ data: litNodeClientReady, isLoading: litNodeClientReadyIsLoading, error: litNodeClientReadyError }] = useAtom(litNodeClientReadyAtom);


  const isLoading = useMemo(() =>
    authLoading || accountsLoading || sessionSigsLoading || !litNodeClientReady,
    [authLoading, accountsLoading, sessionSigsLoading, litNodeClientReady]
  );

  const getTargetRoute = useCallback(() => {
    if (isLoading) return null;

    if (isLitLoggedIn) {
      if (!isOnboarded) return '/onboard';
      return '/lounge';
    }

    if (isOnboarded || (onboardMode === 'Teach' || onboardMode === 'Learn')) {
      return '/login';
    }

    return '/';
  }, [isLoading, isLitLoggedIn, isOnboarded, onboardMode]);

  useEffect(() => {
    const targetRoute = getTargetRoute();
    if (targetRoute && router.pathname !== targetRoute) {
      console.log(`Routing to ${targetRoute}`, {
        isLitLoggedIn,
        isOnboarded,
        onboardMode,
        currentPath: router.pathname
      });
      router.push(targetRoute).catch(e => console.error(`Error routing to ${targetRoute}:`, e));
    }
  }, [getTargetRoute, router, isLitLoggedIn, isOnboarded, onboardMode]);

  // Debug logging
  useEffect(() => {
    console.log('State update', {
      isLitLoggedIn,
      isOnboarded,
      onboardMode,
      isLoading,
      currentPath: router.pathname
    });
  }, [isLitLoggedIn, isOnboarded, onboardMode, isLoading, router.pathname]);

  return {};
};
