import { atomWithQuery } from 'jotai-tanstack-query';
import { atom } from 'jotai';
import { AuthMethod } from '@lit-protocol/types';
import { getProviderFromUrl, isSignInRedirect } from '@lit-protocol/lit-auth-client';
import { authenticateWithDiscord, authenticateWithGoogle } from '@/utils/lit';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;
export const signInInitiatedAtom = atom(false);

export const authenticateAtom = atomWithQuery((get) => ({
  queryKey: ['authenticate', get(signInInitiatedAtom)],
  queryFn: async (): Promise<AuthMethod | null | undefined> => {
    if (!isSignInRedirect(redirectUri)) return null;
    const providerName = getProviderFromUrl();
    if (providerName !== 'google' && providerName !== 'discord') return null;
    return await (providerName === 'google'
      ? authenticateWithGoogle(redirectUri)
      : authenticateWithDiscord(redirectUri));
  },
  enabled: get(signInInitiatedAtom),
}));
