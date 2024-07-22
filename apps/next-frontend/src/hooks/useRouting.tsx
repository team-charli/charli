// useRouting.tsx
import { useIsOnboarded, useIsLitLoggedIn } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useRefreshAuthChain } from "./Auth/refreshAuthChain";
import { useIsSignInRedirectQuery } from './Auth/LitAuth/useIsSignInRedirectQuery';

export function useRouting() {
  const router = useRouter();
  const refreshAuthChain = useRefreshAuthChain();
  const { data: isOnboarded } = useIsOnboarded();
  const { data: isLitLoggedIn } = useIsLitLoggedIn();
  const { data: isOAuthRedirect } = useIsSignInRedirectQuery();

  return useQuery({
    queryKey: ['authRouting', router.asPath, refreshAuthChain.data, isOnboarded, isLitLoggedIn, isOAuthRedirect],
    queryFn: async () => {
      console.log(`Current URL: ${router.asPath} -- from authRouting`);

      if (refreshAuthChain.data?.status === 'incomplete' && router.pathname !== '/login') {
        console.log(`Auth chain incomplete at step: ${refreshAuthChain.data.missingStep}, redirecting to login`);
        await router.push('/login');
        return;
      }

      if (isOAuthRedirect) return { route: null, reason: `isOAuthRedirect: ${isOAuthRedirect}` };

      if (isLitLoggedIn && isOnboarded === false && router.pathname !== '/onboard') {
        await router.push('/onboard');
        return;
      }

      if (isLitLoggedIn && isOnboarded && router.pathname !== '/lounge') {
        await router.push('/lounge');
        return;
      }

      if (!isLitLoggedIn && router.pathname !== '/login') {
        await router.push('/login');
        return;
      }

      console.log(`No navigation needed. Current route: ${router.pathname}`);
      return null;
    },
    enabled: !refreshAuthChain.isLoading && refreshAuthChain.isSuccess,
  });
}
