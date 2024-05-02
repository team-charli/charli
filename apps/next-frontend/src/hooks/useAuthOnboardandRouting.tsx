// useAuthOboardRouting.tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuthenticate, useLitAccounts, useLitSession, useLitLoggedIn } from '../hooks/Lit';
import { SessionSigs } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import { sessionSigsExpired } from '@/utils/app';
import { useHasBalance, useIsOnboarded, useOnboardMode } from '../hooks/Onboard/';
import { useSupabase } from '@/contexts';
import { AuthOnboardContextObj  } from '@/types/types';

export const useAuthOboardRouting = (): AuthOnboardContextObj   => {


  const router = useRouter();
  const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  if (!redirectUrl) throw new Error(`redirectUrl`);
  const { authMethod, authLoading, authError } = useAuthenticate(redirectUrl);
  const { currentAccount, fetchAccounts, accountsLoading, accountsError } = useLitAccounts();
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const { isOnboarded, setIsOnboarded } = useIsOnboarded(supabaseClient, supabaseLoading);
  const { initSession, sessionLoading, sessionError } = useLitSession(isOnboarded);
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');
  const {isLitLoggedIn} = useLitLoggedIn();
  const { onboardMode, setOnboardMode } = useOnboardMode(isOnboarded);
  const { hasBalance } = useHasBalance(isOnboarded);
  const [nativeLang, setNativeLang] = useState('');
  const [name, setName] = useState("");
  const [teachingLangs, setTeachingLangs] = useState([] as string[]);
  const [learningLangs, setLearningLangs] = useState([] as string[]);



  useEffect(() => {

    if (authMethod && currentAccount && !sessionSigs) {
      // User is authenticated but session is not initialized
      initSession(authMethod, currentAccount);


    } else if (authMethod && currentAccount && sessionSigs && sessionSigsExpired(sessionSigs)) {
      // User is authenticated but session has expired
      initSession(authMethod, currentAccount);


    } else if (authMethod && !currentAccount) {
      // User is authenticated but accounts are not fetched
      fetchAccounts(authMethod);

    //} else if (isLitLoggedIn && !isOnboarded) {
    //  console.log("has currentAccount && sessionSigs !onboarded: push to /onboard")
    //  router.push('/onboard').catch(e => console.log(e))


    //} else if (isLitLoggedIn && isOnboarded) {
    //  // User is authenticated and onboarded
    //    console.log('authenticated and onboarded: push to /lounge');
    //    router.push('/lounge').catch(e => console.log(e));



    //} else if (!isLitLoggedIn && onboardMode) {
    //  // User is not authenticated but has selected an onboarding mode
    //  console.log("not authenticated, onboardMode===true: push to /login")
    //  router.push('/login').catch(e => console.log(e));



    //} else if (!isLitLoggedIn && !onboardMode) {
    //  //User is not authenticated and hasn't selected an onboarding mode
    //  console.log("not authenticated, onboardMode===false: push to /")
    //  router.push('/').catch(e => console.log(e));



    //} else if (!isLitLoggedIn && !isOnboarded) {
    //  // User is authenticated but not onboarded
    //  if (onboardMode !== 'Teach' && onboardMode !== "Learn") {
    //    console.log("User is authenticated but not onboarded: push to /", onboardMode);
    //    router.push('/').catch(e => console.log(e))
    //  }

    }
  }, [authMethod, fetchAccounts, currentAccount, initSession, sessionSigs, onboardMode, isOnboarded, isLitLoggedIn]);

  const error = authError || accountsError || sessionError;

  useEffect(() => {
    if (error) {
      console.log(error);
      throw new Error();
    }
  }, [error]);


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
    hasBalance,
    setIsOnboarded,
    nativeLang,
    setNativeLang,
    setOnboardMode,
    setName,
    name,
    teachingLangs,
    setTeachingLangs,
    learningLangs,
    setLearningLangs,
  };
};
