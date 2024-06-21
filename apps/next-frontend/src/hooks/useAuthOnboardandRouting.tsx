'use client';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthenticate, useLitAccounts, useLitSession, useIsLitLoggedIn } from '../hooks/Lit';
import { SessionSigs } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import { useHasBalance, useIsOnboarded, useOnboardMode } from '../hooks/Onboard/';
import { AuthOnboardContextObj  } from '@/types/types';
import { sessionSigsExpired } from '@/utils/app';
import { useAuthenticateAndFetchJWT } from './Supabase/useAuthenticateAndFetchJWT';
import { usePkpWallet } from './Lit/usePkpWallet';
import { useLitClientReady } from '@/contexts/LitClientContext';

export const useAuthOnboardRouting = (): AuthOnboardContextObj   => {

  const router = useRouter();
  const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  if (!redirectUrl) throw new Error(`redirectUrl`);
  const { authMethod, authLoading, authError } = useAuthenticate(redirectUrl);
  const { currentAccount, fetchAccounts, accountsLoading, accountsError } = useLitAccounts();
  const { initSession, sessionLoading, sessionError } = useLitSession();
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');
  const isLitLoggedIn = useIsLitLoggedIn(currentAccount, sessionSigs);
  const { isOnboarded, setIsOnboarded } = useIsOnboarded(isLitLoggedIn);
  const { onboardMode, setOnboardMode } = useOnboardMode(isOnboarded);
  const { hasBalance } = useHasBalance(isOnboarded);
  const [nativeLang, setNativeLang] = useState('');
  const [name, setName] = useState("");
  const [teachingLangs, setTeachingLangs] = useState([] as string[]);
  const [learningLangs, setLearningLangs] = useState([] as string[]);
  const [renderLoginButtons, setRenderLoginButtons] = useLocalStorage<boolean>("renderLoginButtons", true);
  const { litNodeClientReady } = useLitClientReady();
  usePkpWallet();
  const { fetchJWT } = useAuthenticateAndFetchJWT(currentAccount);

  useEffect(() => {
    console.log("Checking JWT fetch conditions", { isLitLoggedIn, currentAccount: !!currentAccount, sessionSigs: !!sessionSigs });
    if (isLitLoggedIn && currentAccount && (!sessionSigs || sessionSigsExpired(sessionSigs))) {
      console.log("Attempting to fetch JWT");
      fetchJWT();
    }
  }, [isLitLoggedIn, currentAccount, sessionSigs, fetchJWT]);

  const isLoading = useMemo(() => authLoading || accountsLoading || sessionLoading, [authLoading, accountsLoading, sessionLoading]);

  const handleAuthAndRouting = useCallback(async () => {

    // Auth logic
    if (!authMethod && !currentAccount && !sessionSigs) {
    } else if (authMethod && currentAccount && !sessionSigs) {
      await initSession(authMethod, currentAccount);
    } else if (authMethod && currentAccount && sessionSigs && sessionSigsExpired(sessionSigs)) {
      console.log('initSession');
      await initSession(authMethod, currentAccount);
    } else if (authMethod && !currentAccount && !sessionSigs) {
      await fetchAccounts(authMethod);
    }

    // Routing logic
    if (isLoading) return;

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
  }, [authMethod, currentAccount, sessionSigs, isLoading, isLitLoggedIn, isOnboarded, onboardMode, router, initSession, fetchAccounts, litNodeClientReady]);

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
    authMethod,
    authLoading,
    accountsLoading,
    sessionLoading,
    authError,
    accountsError,
    sessionError,
    isLitLoggedIn,
    onboardMode,
    isOnboarded,
    setIsOnboarded,
    hasBalance,
    nativeLang,
    setNativeLang,
    setOnboardMode,
    setName,
    name,
    teachingLangs,
    setTeachingLangs,
    learningLangs,
    setLearningLangs,

    renderLoginButtons,
    setRenderLoginButtons,
  };
};
