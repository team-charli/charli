import { atomWithQuery } from 'jotai-tanstack-query';
import { AuthMethod } from '@lit-protocol/types';
// import { getProviderFromUrl, isSignInRedirect } from '@lit-protocol/lit-auth-client';
// import { authenticateWithDiscord, authenticateWithGoogle } from '@/utils/lit';
// import { clone } from 'lodash';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;


export const authenticateAtom = atomWithQuery(() => ({
  queryKey: ['authenticate'],
  queryFn: async (): Promise<AuthMethod | null | undefined> => {
    if (typeof window === 'undefined') return null;

    const { isSignInRedirect, getProviderFromUrl } = await import('@lit-protocol/lit-auth-client');
    const { authenticateWithDiscord, authenticateWithGoogle } = await import('@/utils/lit');

    // Check if the current URL has a length greater than 'https://localhost:3000/login'

      console.log('authenticateAtom queryFn - current URL:', window.location.href);
      console.log('authenticateAtom queryFn - current pathname:', window.location.pathname);
      console.log('authenticateAtom queryFn - redirectUri:', redirectUri);

      if (typeof window === 'undefined') {
        console.log('authenticateAtom queryFn - running on server-side, returning null');
        return null; // Skip on server-side
      }

      console.log('authenticateAtom queryFn - checking if isSignInRedirect exists');

      // Check if the isSignInRedirect function is defined
      if (typeof isSignInRedirect !== 'function') {
        console.log('authenticateAtom queryFn - isSignInRedirect is not a function, returning null');
        return null;
      }

      console.log('authenticateAtom queryFn - before isSignInRedirect');
      const isRedirect = isSignInRedirect(redirectUri);
      console.log('authenticateAtom queryFn - after isSignInRedirect, isRedirect:', isRedirect);

      if (!isRedirect) {
        console.log('authenticateAtom queryFn - isSignInRedirect is false, returning null');
        return null;
      }

      const providerName = getProviderFromUrl();
      console.log(`authenticateAtom queryFn - provider name: ${providerName}`);
      if (providerName !== 'google' && providerName !== 'discord') {
        console.log('authenticateAtom queryFn - provider not supported, returning null');
        return null;
      }

      console.log('authenticateAtom queryFn - calling authenticateWithGoogle/Discord');
      return await (providerName === 'google'
        ? authenticateWithGoogle(redirectUri)
        : authenticateWithDiscord(redirectUri));
  },
  enabled: typeof window !== 'undefined',
}));
