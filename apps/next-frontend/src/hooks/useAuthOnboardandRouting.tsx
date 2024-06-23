'use client';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo } from 'react';
import { AuthOnboardContextObj  } from '@/types/types';
import { sessionSigsExpired } from '@/utils/app';
import { usePkpWallet } from '@/hooks/RecoilInitializers/usePkpWallet';
import { useLitAuthChain } from '@/hooks/RecoilInitializers/useLitAuthChain';
import {  useRecoilValue } from 'recoil';
import { isLitLoggedInSelector, supabaseJWTSelector, supabaseClientSelector } from '@/selectors/index';
import { isOnboardedAtom, onboardModeAtom } from '@/atoms/userDataAtoms';
import { useAuthenticateAndFetchJWT } from './Supabase/useAuthenticateAndFetchJWT';
import { useSupabaseClient } from './RecoilInitializers/useSupabaseClient';
import { useLitClientReady } from '@/contexts/LitClientContext';
import { useHasBalance } from './RecoilInitializers/useHasBalance';
import { useIsOnboarded } from './RecoilInitializers/useIsOnboarded';

export const useAuthOnboardRouting = (): AuthOnboardContextObj   => {

  const router = useRouter();

  const { litNodeClientReady } = useLitClientReady();

  const {
    authMethod,
    authLoading,
    authError,
    currentAccount,
    accountsLoading,
    accountsError,
    sessionSigs,
    sessionSigsLoading,
    sessionSigsError,
    initiateAuthChain,
  } = useLitAuthChain();
  const { initializePkpWallet } = usePkpWallet();
  const {initializeFetchJWT} = useAuthenticateAndFetchJWT()
  const {initializeSupabaseClient} = useSupabaseClient();
  const { initializeIsOnboarded, isOnboarded } = useIsOnboarded();
  const { initializeHasBalance, hasBalance } = useHasBalance();
  useEffect(() => {
    const initializeAll = async () => {
      try {
        await initiateAuthChain();
        await initializePkpWallet();
        await initializeFetchJWT();
        await initializeSupabaseClient();
        await initializeIsOnboarded();
        await initializeHasBalance();
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    initializeAll();
  }, [initiateAuthChain, initializePkpWallet, initializeFetchJWT]);

  const onboardMode  = useRecoilValue(onboardModeAtom);
  const isLitLoggedIn = useRecoilValue(isLitLoggedInSelector);


  const isLoading = useMemo(() => authLoading || accountsLoading || sessionSigsLoading, [authLoading, accountsLoading, sessionSigsLoading]);
  const handleAuthAndRouting = useCallback(async () => {
    let targetRoute = null;
    if (isLitLoggedIn && !isOnboarded && router.pathname !== '/onboard') {
      console.log("has currentAccount && sessionSigs !onboarded: push to /onboard");
      await router.push('/onboard');
    } else if (isLitLoggedIn && isOnboarded && router.pathname !== '/lounge') {
      console.log('authenticated and onboarded: push to /lounge');
      await router.push('/lounge');
    } else if (!isLitLoggedIn && isOnboarded && router.pathname !== '/login') {
      console.log('onboarded && !isLitLoggedIn');
      await router.push('/login');
    } else if (!isLitLoggedIn && (onboardMode === 'Teach' || onboardMode === 'Learn')) {
      console.log("not authenticated, onboardMode===true: push to /login", {isLitLoggedIn, sessionSigs: Boolean(sessionSigs), currentAccount: Boolean(currentAccount), onboardMode, isExpired: sessionSigs ? sessionSigsExpired(sessionSigs) : null});
      targetRoute = '/login';
    } else if (!isLitLoggedIn && !onboardMode) {
      console.log("not isLitLoggedIn, onboardMode===false: push to /");
      targetRoute = '/';
    } else if (!isLitLoggedIn && !isOnboarded) {
      if (onboardMode !== 'Teach' && onboardMode !== "Learn") {
        console.log("User is authenticated but not onboarded: push to /", onboardMode);
        targetRoute = '/';
      } else if ((onboardMode === 'Teach' || onboardMode === "Learn")) {
        targetRoute = '/onboard';
      }
    }

    if (targetRoute && router.pathname !== targetRoute) {
      router.push(targetRoute).catch(e => console.error(`Error routing to ${targetRoute}:`, e));
    }
  }, [authMethod, currentAccount, sessionSigs, isLoading, isLitLoggedIn, isOnboarded, onboardMode, router, litNodeClientReady]);

  useEffect(() => {
    // console.log('AuthOnboardRouting effect', {
    //   isLitLoggedIn,
    //   isOnboarded,
    //   authMethod: !!authMethod,
    //   currentAccount: !!currentAccount,
    //   sessionSigs: !!sessionSigs,
    //   isLoading
    // });
    handleAuthAndRouting();
  }, [isLitLoggedIn, isOnboarded, authMethod, currentAccount, sessionSigs, isLoading, handleAuthAndRouting, litNodeClientReady]);

  return {
    hasBalance,

  };
};

//TODO: check and refresh JWT;
//TODO: check and refresh sessionSigs (besides in routing)
