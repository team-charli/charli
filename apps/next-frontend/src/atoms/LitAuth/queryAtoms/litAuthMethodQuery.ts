import { atomWithQuery } from 'jotai-tanstack-query';
import { AuthMethod } from '@lit-protocol/types';
import { litAuthMethodStateAtom, signInInitiatedAtom } from '../litAuthMethodStateAtom';
import { getProviderFromUrl, isSignInRedirect } from '@lit-protocol/lit-auth-client';
import { authenticateWithDiscord, authenticateWithGoogle } from '@/utils/lit';
import { AuthMethodCallbacks } from '@/types/types';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

const callbacks: AuthMethodCallbacks = {
  onSuccess: (data, { set }) => {
    set(litAuthMethodStateAtom, (prev) => ({ ...prev, data, error: undefined }));
  },
  onError: (error, { set }) => {
    set(litAuthMethodStateAtom, (prev) => ({ ...prev, data: null, error }));
  },
  onSettled: (data, error, { set }) => {
    set(litAuthMethodStateAtom, (prev) => ({ ...prev, isLoading: false }));
  },
};

export const authenticateAtom = atomWithQuery((get) => ({
  queryKey: ['authenticate', get(signInInitiatedAtom)],
  queryFn: async (): Promise<AuthMethod | null> => {
    const signInInitiated = get(signInInitiatedAtom);
    if (!signInInitiated || !isSignInRedirect(redirectUri)) return null;
    const providerName = getProviderFromUrl();
    if (providerName !== 'google' && providerName !== 'discord') return null;
    try {
      const result = await (providerName === 'google'
        ? authenticateWithGoogle(redirectUri)
        : authenticateWithDiscord(redirectUri));
      return result as AuthMethod;
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }
  },
  ...callbacks,
  enabled: get(signInInitiatedAtom),
}));
