import { atomWithQuery } from 'jotai-tanstack-query';
import { AuthQueryState, AuthOnSuccessCallback, AuthOnErrorCallback, AuthOnSettledCallback } from '@/types/types';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const authStateAtom = atom<AuthQueryState>({
  authMethod: null,
  error: undefined,
  isLoading: false,
  signInInitiated: false,
});

const onSuccessCallback: AuthOnSuccessCallback = (data, { set }) => {
  set(authStateAtom, (prev) => ({
    ...prev,
    authMethod: data,
    error: undefined,
    isLoading: false,
    signInInitiated: false
  }));
};

const onErrorCallback: AuthOnErrorCallback = (error, { set }) => {
  set(authStateAtom, (prev) => ({
    ...prev,
    authMethod: null,
    error,
    isLoading: false,
    signInInitiated: false
  }));
};

const onSettledCallback: AuthOnSettledCallback = (data, error, { set }) => {
  set(authStateAtom, (prev) => ({ ...prev, isLoading: false }));
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
      throw error; // Throwing the error so that onError callback is triggered
    }
  },
  onSuccess: onSuccessCallback,
  onError: onErrorCallback,
  onSettled: onSettledCallback,
  enabled: get(signInInitiatedAtom), // Only run the query when sign-in is initiated
}));
