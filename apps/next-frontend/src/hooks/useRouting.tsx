// useRouting.tsx
import { QueryClient, QueryObserver, useQuery, useQueryClient} from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useAuth, useLitAccount } from '@/contexts/AuthContext';
import React from "react";
import { routingLogger } from "@/pages/_app";

export function useRouting() {
  const router = useRouter();
  const initialAuthChain = useAuth();
  const queryClient = useQueryClient();
  const {data: litAccount} = useLitAccount();
  // Initial auth routing
  const authRoutingQuery = useQuery({
    queryKey: ['authRouting', router.asPath],
    queryFn: () => performRoutingLogic(queryClient),
    enabled: initialAuthChain.isSuccess
  });

  // Reactive routing
  const reactiveRoutingQuery = useQuery({
    queryKey: ['reactiveRouting', router.asPath],
    queryFn: () => performRoutingLogic(queryClient),
    enabled: false, // We'll manually control when this runs
  });

  React.useEffect(() => {
    if (initialAuthChain.isSuccess) {
    routingLogger.info("initialAuthChain.isSuccess")
    }
  }, [initialAuthChain.isSuccess])

React.useEffect(() => {
    if (authRoutingQuery.isSuccess) {
      const refetchReactiveRouting = () => {
        reactiveRoutingQuery.refetch();
      };
      const isLitLoggedInObserver = new QueryObserver(queryClient, { queryKey: ['isLitLoggedIn'] });
      const isOnboardedObserver = new QueryObserver(queryClient, { queryKey: ['isOnboarded', litAccount] });

      const unsubscribeIsLitLoggedIn = isLitLoggedInObserver.subscribe(() => {
        refetchReactiveRouting();
      });

      const unsubscribeIsOnboarded = isOnboardedObserver.subscribe(() => {
        refetchReactiveRouting();
      });

      return () => {
        unsubscribeIsLitLoggedIn();
        unsubscribeIsOnboarded();
      };
    } else if (authRoutingQuery.isError) {
      console.error(authRoutingQuery.error)
    }
  }, [authRoutingQuery.isSuccess, queryClient, reactiveRoutingQuery, litAccount]);

  return { authRoutingQuery, reactiveRoutingQuery };


  async function performRoutingLogic(queryClient: QueryClient) {
    const litAccount = queryClient.getQueryData(['litAccount'])
    const isOnboarded = queryClient.getQueryData(['isOnboarded', litAccount]);
    const isLitLoggedIn = queryClient.getQueryData(['isLitLoggedIn']);
    const isOAuthRedirect = queryClient.getQueryData(['isSignInRedirect']);

    // routingLogger.info('--- Start of routing logic ---');
    // routingLogger.info(`Current URL: ${router.asPath}`);
    // routingLogger.info(`initialAuthChain.isSuccess: ${initialAuthChain.isSuccess}`);
    // routingLogger.info(`isOAuthRedirect: ${!!isOAuthRedirect}`);
    // routingLogger.info(`isLitLoggedIn: ${isLitLoggedIn}`);
    // routingLogger.info(`Current pathname: ${router.pathname}`);
    // routingLogger.info(`isOnboarded: ${isOnboarded}`);

    if (isLitLoggedIn && isOnboarded === false && (router.pathname !== '/onboard' || isOAuthRedirect)) {
      routingLogger.info('Conditions met for routing to /onboard');
      await router.push('/onboard');
      return { action: 'redirected', to: '/onboard' };
    }

    if (isLitLoggedIn && isOnboarded && router.pathname !== '/lounge') {
      routingLogger.info('Conditions met for routing to /lounge');
      await router.push('/lounge');
      return { action: 'redirected', to: '/lounge' };
    }

    if (!isLitLoggedIn && router.pathname !== '/login') {
      routingLogger.info('Not logged in, redirecting to /login');
      await router.push('/login');
      return { action: 'redirected', to: '/login', reason: 'notLoggedIn' };
    }

    routingLogger.info(`No navigation needed. Current route: ${router.pathname}`);
    routingLogger.info('--- End of routing logic ---');
    return { action: 'none' };
  }
}
