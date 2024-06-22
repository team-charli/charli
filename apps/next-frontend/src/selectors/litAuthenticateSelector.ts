import { selector, DefaultValue } from 'recoil';
import { authMethodAtom, authLoadingAtom, authErrorAtom, signInInitiatedAtom } from '@/atoms/litAuthenticateAtoms';
import { authenticateWithGoogle, authenticateWithDiscord} from '@/utils/lit';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';
import { AuthMethod } from '@lit-protocol/types';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const authenticateSelector = selector<AuthMethod | null>({
  key: 'authenticateSelector',
  get: async ({ get }): Promise<AuthMethod | null> => {
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
      return null;
    }
  },
  set: ({ set }, newValue: AuthMethod | null | DefaultValue) => {
    if (newValue instanceof DefaultValue) {
      set(authMethodAtom, null);
      set(authErrorAtom, undefined);
      set(authLoadingAtom, false);
      set(signInInitiatedAtom, false);
    } else if (newValue instanceof Error) {
      set(authErrorAtom, newValue);
      set(authMethodAtom, null);
      set(authLoadingAtom, false);
      set(signInInitiatedAtom, false);
    } else {
      set(authMethodAtom, newValue);
      set(authErrorAtom, undefined);
      set(authLoadingAtom, false);
      set(signInInitiatedAtom, false);
    }
  },
});
