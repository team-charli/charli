import {useLitAuthMethodQuery, useLitAccountQuery, useLitSessionSigsQuery, usePkpWallet, useNonce, useSignature, useSupabaseJWT, useSupabaseClient, useIsOnboarded, useHasBalance } from '@/hooks/Auth/'

export const useInitQueries = () => {
  const authMethodQuery = useLitAuthMethodQuery();
  const litAccountQuery = useLitAccountQuery(authMethodQuery.data);
  const sessionSigsQuery = useLitSessionSigsQuery(authMethodQuery.data, litAccountQuery.data);
  usePkpWallet();
  useNonce();
  useSignature();
  useSupabaseJWT();
  useSupabaseClient();
  useIsOnboarded();
  useHasBalance();
  return { authMethodQuery, litAccountQuery, sessionSigsQuery };
};
