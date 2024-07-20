import { useQuery } from '@tanstack/react-query';
import { isSignInRedirect } from "@lit-protocol/lit-auth-client";
import { useRouter } from 'next/router';

export const useIsSignInRedirectQuery = () => {
  const router = useRouter();
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

  return useQuery<boolean>({
    queryKey: ['isSignInRedirect', router.asPath],
    queryFn: async (): Promise<boolean> => {
      return isSignInRedirect(redirectUri);
    },
    enabled: router.isReady,
    staleTime: Infinity,  // The result won't change during the lifetime of a page
    gcTime: 0,  // Don't cache between page loads
  });
};
