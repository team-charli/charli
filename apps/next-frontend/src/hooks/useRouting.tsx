// useRouting.tsx

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useAuth } from '@/contexts/AuthContext';

export function useRouting() {
  const router = useRouter();
  const initialAuthChain = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['authRouting', router.asPath],
    queryFn: async () => {
      const litAccount = queryClient.getQueryData(['litAccount'])
      const isOnboarded = queryClient.getQueryData(['isOnboarded', litAccount]);
      const isLitLoggedIn = queryClient.getQueryData(['isLitLoggedIn']);
      const isOAuthRedirect = queryClient.getQueryData(['isSignInRedirect']);

      console.log('--- Start of routing logic ---');
      console.log(`Current URL: ${router.asPath}`);
      console.log(`initialAuthChain.isSuccess: ${initialAuthChain.isSuccess}`);
      console.log(`isOAuthRedirect: ${!!isOAuthRedirect}`);
      console.log(`isLitLoggedIn: ${isLitLoggedIn}`);
      console.log(`Current pathname: ${router.pathname}`);
      console.log(`isOnboarded: ${isOnboarded}`);

      if (isLitLoggedIn && isOnboarded === false && (router.pathname !== '/onboard' || isOAuthRedirect)) {
        console.log('Conditions met for routing to /onboard');
        await router.push('/onboard');
        return { action: 'redirected', to: '/onboard' };
      }

      if (isLitLoggedIn && isOnboarded && router.pathname !== '/lounge') {
        console.log('Conditions met for routing to /lounge');
        await router.push('/lounge');
        return { action: 'redirected', to: '/lounge' };
      }

      if (!isLitLoggedIn && router.pathname !== '/login') {
        console.log('Not logged in, redirecting to /login');
        await router.push('/login');
        return { action: 'redirected', to: '/login', reason: 'notLoggedIn' };
      }

      console.log(`No navigation needed. Current route: ${router.pathname}`);
      console.log('--- End of routing logic ---');
      return { action: 'none' };
    },
    enabled: initialAuthChain.isSuccess
  });
}
