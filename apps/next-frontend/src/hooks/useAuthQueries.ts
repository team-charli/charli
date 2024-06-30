// useAuthQueries.ts
import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { authMethodAtom, litAccountAtom, sessionSigsAtom, litNodeClientReadyAtom } from '@/atoms/atoms';
import { isSignInRedirect, getProviderFromUrl } from '@lit-protocol/lit-auth-client';
import { litNodeClient } from '@/utils/litClients';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { getPKPs, getProviderByAuthMethod, mintPKP } from '@/utils/lit';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const useAuthQueries = () => {
  const setAuthMethod = useSetAtom(authMethodAtom);
  const setLitAccount = useSetAtom(litAccountAtom);
  const setSessionSigs = useSetAtom(sessionSigsAtom);
  const setLitNodeClientReady = useSetAtom(litNodeClientReadyAtom);

  const { data: authMethod, isLoading: authLoading } = useQuery({
    queryKey: ['authenticate'],
    queryFn: async () => {
      if (typeof window === 'undefined' || !isSignInRedirect(redirectUri)) return null;

      const providerName = getProviderFromUrl();
      if (providerName !== 'google' && providerName !== 'discord') return null;

      const { authenticateWithDiscord, authenticateWithGoogle } = await import('@/utils/lit');
      const result = await (providerName === 'google'
        ? authenticateWithGoogle(redirectUri)
        : authenticateWithDiscord(redirectUri));

      setAuthMethod(result);
      return result;
    },
    enabled: typeof window !== 'undefined',
  });

  const { data: litAccount, isLoading: accountsLoading } = useQuery({
    queryKey: ['fetchLitAccounts', authMethod],
    queryFn: async () => {
      if (!authMethod) return null;
      const myPKPs = await getPKPs(authMethod);
      const result = myPKPs.length ? myPKPs[0] : await mintPKP(authMethod);
      setLitAccount(result);
      return result;
    },
    enabled: !!authMethod,
  });

  const { data: sessionSigs, isLoading: sessionSigsLoading } = useQuery({
    queryKey: ['litSession', authMethod, litAccount],
    queryFn: async () => {
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
    },
    enabled: !!authMethod && !!litAccount,
  });

  const { data: litNodeClientReady, isLoading: litNodeClientReadyIsLoading } = useQuery({
    queryKey: ['litNodeClientReady'],
    queryFn: async () => {
      try {
        const connectPromise = litNodeClient.connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 10000)
        );
        await Promise.race([connectPromise, timeoutPromise]);
        const result = true;
        setLitNodeClientReady(result);
        return result;
      } catch (error) {
        console.error("Error connecting LitNodeClient:", error);
        throw error;
      }
    },
    staleTime: Infinity,
  });

  const isLoading = authLoading || accountsLoading || sessionSigsLoading || litNodeClientReadyIsLoading;

  return { isLoading, authMethod, litAccount, sessionSigs, litNodeClientReady };
};
