'use client';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo } from 'react';
import { AuthOnboardContextObj  } from '@/types/types';
import { sessionSigsExpired } from '@/utils/app';
import { onboardModeAtom } from '@/atoms/userDataAtoms';
import { useLitClientReady } from '@/contexts/LitClientContext';
import { useAtom } from 'jotai';
import { authenticateAtom } from '@/atoms/LitAuth/litAuthMethodAtomQuery';
import { fetchLitAccountsAtom } from '@/atoms/LitAuth/litAccountsAtomQuery';
import { litSessionAtom } from '@/atoms/LitAuth/sessionSigsAtomQuery';
import { pkpWalletAtom } from '@/atoms/PkpWallet/pkpWalletAtomQuery';
import { supabaseClientAtom } from '@/atoms/SupabaseClient/supabaseClientAtom';
import { nonceAtom } from '@/atoms/SupabaseClient/nonceAtomQuery';
import { signatureAtom } from '@/atoms/SupabaseClient/signatureAtomQuery';
import { isOnboardedAtom } from '@/atoms/IsOnboarded/isOnboardedAtomQuery';
import { hasBalanceAtom } from '@/atoms/HasBalance/hasBalanceAtomQuery';
import { isLitLoggedInAtom } from '@/atoms/LitAuth/isLitLoggedInAtom';

export const useAuthOnboardRouting = (): AuthOnboardContextObj   => {
  const router = useRouter();

  const [{ data: authMethod, isLoading: authLoading, error: authError }] = useAtom(authenticateAtom);
  const [{ data: currentAccount, isLoading: accountsLoading, error: accountsError }] = useAtom(fetchLitAccountsAtom);
  const [{ data: sessionSigs, isLoading: sessionSigsLoading, error: sessionSigsError }] = useAtom(litSessionAtom);
  const [{data: pkpWallet, isLoading: pkpWalletLoading, error: pkpWalletError }] = useAtom(pkpWalletAtom);
  useAtom(pkpWalletAtom)
  useAtom(nonceAtom);
  useAtom(signatureAtom);
  useAtom(supabaseClientAtom);
  const [isOnboarded] = useAtom(isOnboardedAtom);
  const [hasBalance] = useAtom(hasBalanceAtom);
  const [isLitLoggedIn] = useAtom(isLitLoggedInAtom)
  const { litNodeClientReady } = useLitClientReady();
  const [onboardMode]= useAtom(onboardModeAtom);

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
  };
};

//TODO: check and refresh JWT;
//TODO: check and refresh sessionSigs (besides in routing)
