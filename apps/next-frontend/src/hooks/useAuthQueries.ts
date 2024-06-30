// useAuthQueries.ts
import { useQuery } from '@tanstack/react-query';
import { useSetAtom, useAtomValue } from 'jotai';
import {
  authMethodAtom, litAccountAtom, sessionSigsAtom, litNodeClientReadyAtom,
  authLoadingAtom, accountsLoadingAtom, sessionSigsLoadingAtom, litNodeClientReadyLoadingAtom,
  authErrorAtom, accountsErrorAtom, sessionSigsErrorAtom, litNodeClientReadyErrorAtom,
  isOAuthRedirectAtom
} from '@/atoms/atoms';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { getPKPs, getProviderByAuthMethod, mintPKP } from '@/utils/lit';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useAuthQueries = () => {
  console.log('useAuthQueries')
  const setAuthMethod = useSetAtom(authMethodAtom);
  const setLitAccount = useSetAtom(litAccountAtom);
  const setSessionSigs = useSetAtom(sessionSigsAtom);
  const setLitNodeClientReady = useSetAtom(litNodeClientReadyAtom);

  const setAuthLoading = useSetAtom(authLoadingAtom);
  const setAccountsLoading = useSetAtom(accountsLoadingAtom);
  const setSessionSigsLoading = useSetAtom(sessionSigsLoadingAtom);
  const setLitNodeClientReadyLoading = useSetAtom(litNodeClientReadyLoadingAtom);

  const setAuthError = useSetAtom(authErrorAtom);
  const setAccountsError = useSetAtom(accountsErrorAtom);
  const setSessionSigsError = useSetAtom(sessionSigsErrorAtom);
  const setLitNodeClientReadyError = useSetAtom(litNodeClientReadyErrorAtom);

  const setIsOAuthRedirect = useSetAtom(isOAuthRedirectAtom);

  const authMethod = useAtomValue(authMethodAtom);
  const litAccount = useAtomValue(litAccountAtom);

  useQuery({
    queryKey: ['authenticate'],
    queryFn: async () => {
      console.log("Auth query function started");
      setAuthLoading(true);
      try {
        const isRedirect = isSignInRedirect(redirectUri);
        console.log("Is redirect?", isRedirect, "Redirect URI:", redirectUri);
        setIsOAuthRedirect(isRedirect);
        if (!isRedirect) {
          console.log("Not a redirect, returning null");
          return null;
        }

        const providerName = getProviderFromUrl();
        if (providerName !== 'google' && providerName !== 'discord') return null;

        const { authenticateWithDiscord, authenticateWithGoogle } = await import('@/utils/lit');
        const result = providerName === 'google'
          ? await authenticateWithGoogle(redirectUri)
          : await authenticateWithDiscord(redirectUri);

        setAuthMethod(result);
        return result;
      } catch (error) {
        console.error("Error in auth query:", error);

        setAuthError(error instanceof Error ? error : new Error('Unknown error during authentication'));
        throw error;
      } finally {
        setAuthLoading(false);
        console.log("Auth query function completed");

      }
    },
    enabled: typeof window !== 'undefined',
  });

  useQuery({
    queryKey: ['fetchLitAccounts', authMethod],
    queryFn: async () => {
      setAccountsLoading(true);
      try {
        if (!authMethod) return null;
        const myPKPs = await getPKPs(authMethod);
        const result = myPKPs.length ? myPKPs[0] : await mintPKP(authMethod);
        setLitAccount(result);
        return result;
      } catch (error) {
        setAccountsError(error instanceof Error ? error : new Error('Unknown error fetching Lit accounts'));
        throw error;
      } finally {
        setAccountsLoading(false);
      }
    },
    enabled: !!authMethod,
  });

  useQuery({
    queryKey: ['litSession', authMethod, litAccount],
    queryFn: async () => {
      setSessionSigsLoading(true);
      try {
        if (!authMethod || !litAccount) return null;
        if (!litNodeClient.ready) {
          await litNodeClient.connect();
        }
        const provider = getProviderByAuthMethod(authMethod);
        if (!provider) return null;
        const resourceAbilityRequests = [
          {
            resource: new LitPKPResource('*'),
            ability: LitAbility.PKPSigning,
          },
          {
            resource: new LitActionResource('*'),
            ability: LitAbility.LitActionExecution,
          },
        ];
        const result = await litNodeClient.getPkpSessionSigs({
          pkpPublicKey: litAccount.publicKey,
          authMethods: [authMethod],
          resourceAbilityRequests: resourceAbilityRequests
        });
        setSessionSigs(result);
        return result;
      } catch (error) {
        setSessionSigsError(error instanceof Error ? error : new Error('Unknown error getting Lit session'));
        throw error;
      } finally {
        setSessionSigsLoading(false);
      }
    },
    enabled: !!authMethod && !!litAccount,
  });

  useQuery({
    queryKey: ['litNodeClientReady'],
    queryFn: async () => {
      setLitNodeClientReadyLoading(true);
      try {
        const connectPromise = litNodeClient.connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 10000)
        );
        await Promise.race([connectPromise, timeoutPromise]);
        setLitNodeClientReady(true);
        return true;
      } catch (error) {
        console.error("Error connecting LitNodeClient:", error);
        setLitNodeClientReadyError(error instanceof Error ? error : new Error('Unknown error connecting Lit Node Client'));
        throw error;
      } finally {
        setLitNodeClientReadyLoading(false);
      }
    },
    staleTime: Infinity,
  });
};
