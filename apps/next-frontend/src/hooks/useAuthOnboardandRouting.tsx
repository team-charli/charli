'use client';
// useAuthOboardRouting.tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuthenticate, useLitAccounts, useLitSession, useIsLitLoggedIn } from '../hooks/Lit';
import { SessionSigs } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import { sessionSigsExpired } from '@/utils/app';
import { useHasBalance, useIsOnboarded, useOnboardMode } from '../hooks/Onboard/';
import { AuthOnboardContextObj  } from '@/types/types';
import useLitClients from './Lit/useLitClients';
import { litNodeClient } from '@/utils/litClients';

export const useAuthOboardRouting = (): AuthOnboardContextObj   => {

  useLitClients();

  const router = useRouter();
  const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  if (!redirectUrl) throw new Error(`redirectUrl`);
  const { authMethod, authLoading, authError } = useAuthenticate(redirectUrl);
  const { currentAccount, fetchAccounts, accountsLoading, accountsError } = useLitAccounts();
  const { isOnboarded, setIsOnboarded } = useIsOnboarded();
  const { initSession, sessionLoading, sessionError } = useLitSession();
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');
  const isLitLoggedIn = useIsLitLoggedIn(currentAccount, sessionSigs);
  const { onboardMode, setOnboardMode } = useOnboardMode(isOnboarded);
  const { hasBalance } = useHasBalance(isOnboarded);
  const [nativeLang, setNativeLang] = useState('');
  const [name, setName] = useState("");
  const [teachingLangs, setTeachingLangs] = useState([] as string[]);
  const [learningLangs, setLearningLangs] = useState([] as string[]);
  const [renderLoginButtons, setRenderLoginButtons] = useLocalStorage<boolean>("renderLoginButtons", true);

  useEffect(() => {
    if (!authMethod && !currentAccount && !sessionSigs) {
    //
    } else if (authMethod && currentAccount && !sessionSigs && litNodeClient.ready) {
      // User is authenticated but session is not initialized
      initSession(authMethod, currentAccount);

    } else if (authMethod && currentAccount && sessionSigs && sessionSigsExpired(sessionSigs) && litNodeClient.ready) {
      // User is authenticated but session has expired
      initSession(authMethod, currentAccount);


    } else if (authMethod && !currentAccount && !sessionSigs) {
      // User is authenticated but accounts are not fetched
      fetchAccounts(authMethod);

    } else if (sessionSigs && currentAccount && !authMethod){
    } else if (sessionSigs && currentAccount && authMethod) {
    }
    else {
      // console.log("something else happened. Other condidtions:(authMethod && !currentAccount && !sessionSigs);User is authenticated but accounts are not fetched; authMethod && currentAccount && sessionSigs && sessionSigsExpired(sessionSigs)User is authenticated but session has expired ", {authMethod: Boolean(authMethod), currentAccount: Boolean(currentAccount), sessionSigs: Boolean(sessionSigs)})

    }

    if (isLitLoggedIn && !isOnboarded) {
      console.log("has currentAccount && sessionSigs !onboarded: push to /onboard")
      router.push('/onboard').catch(e => console.log(e))


    } else if (isLitLoggedIn && isOnboarded) {
      // User is authenticated and onboarded
      console.log('authenticated and onboarded: push to /lounge');
      router.push('/lounge').catch(e => console.error(e));

   } else if (!isLitLoggedIn && isOnboarded) {
      console.log('onboared && !isLitLoggedIn')
      router.push('/login').catch(e => console.error(e));

    } else if (!isLitLoggedIn && (onboardMode === 'Teach' || onboardMode === 'Learn')) {
      // User is not authenticated but has selected an onboarding mode
      console.log("not authenticated, onboardMode===true: push to /login", {isLitLoggedIn, sessionSigs: Boolean(sessionSigs), currentAccount: Boolean(currentAccount), onboardMode, isExpired: sessionSigsExpired(sessionSigs)})
      router.push('/login').catch(e => console.error("push to /login", e));


    } else if (!isLitLoggedIn && !onboardMode) {
      //User is not authenticated and hasn't selected an onboarding mode
      console.log("not authenticated, onboardMode===false: push to /")
      router.push('/').catch(e => console.error(e));
    }
    else if (!isLitLoggedIn && !isOnboarded) {
      // User is authenticated but not onboarded
      if (onboardMode !== 'Teach' && onboardMode !== "Learn") {
        console.log("User is authenticated but not onboarded: push to /", onboardMode);
        router.push('/').catch(e => console.error(e))
      } else if (onboardMode === 'Teach' || onboardMode === "Learn") {
        router.push('/onboard').catch(e => console.error(e))
      }
    }
  }, [authMethod, currentAccount, sessionSigs, fetchAccounts, initSession,  onboardMode, isOnboarded, isLitLoggedIn, litNodeClient.ready]);


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
