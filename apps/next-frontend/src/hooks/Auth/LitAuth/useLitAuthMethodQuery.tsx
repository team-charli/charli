import { useQuery } from '@tanstack/react-query';
import {  getProviderFromUrl } from '@lit-protocol/lit-auth-client';

const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

interface LitAuthMethodQueryParams {
  queryKey: [string];
  enabledDeps: boolean,
};

export const useLitAuthMethodQuery = ({
  queryKey,
  enabledDeps
}: LitAuthMethodQueryParams) => {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const providerName = getProviderFromUrl();
      if (providerName !== 'google' && providerName !== 'discord') return ;

      const { authenticateWithDiscord, authenticateWithGoogle } = await import('@/utils/lit');
      const result = providerName === 'google'
        ? await authenticateWithGoogle(redirectUri)
        : await authenticateWithDiscord(redirectUri);

      if (result) {
        return result;
      }
      return null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: enabledDeps,
    retry: false,
  });
};
