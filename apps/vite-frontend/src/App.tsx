//App.tsx

import log from 'loglevel';
export const authChainLogger = log.getLogger('authChainLogger');
export const routingLogger = log.getLogger('routingLogger');
export const mutationLogger = log.getLogger('mutationLogger');

authChainLogger.setLevel('silent');
routingLogger.setLevel('silent');
mutationLogger.setLevel('info');

import { Provider as JotaiProvider } from 'jotai/react';
import '@/styles/globals.css';
import { HuddleProvider } from "@huddle01/react";
import { RouterProvider } from '@tanstack/react-router';
import { huddleClient } from './Huddle/huddleClient';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { experimental_createPersister } from '@tanstack/react-query-persist-client';
import { router, RouterContext } from './TanstackRouter/router';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SessionsProvider from './contexts/SessionsContext';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
    },
  },
});

export const persister = experimental_createPersister({
  storage: window.localStorage,
  deserialize: (cachedString) => JSON.parse(cachedString),
  serialize: (client) => JSON.stringify(client),
});

function CharliApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {(authContext) => (
          <JotaiProvider>
            <ReactQueryDevtools initialIsOpen={false} />
            <SessionsProvider>
              <HuddleProvider client={huddleClient}>
                {/* Only mount the router once we're ready */}
                <AuthGate>
                  <RouterProvider
                    router={router}
                    context={{
                      auth: authContext,
                      queryClient,
                    } as RouterContext}
                  />
                </AuthGate>
              </HuddleProvider>
            </SessionsProvider>
          </JotaiProvider>
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isError } = useAuth();

  // If your top-level auth is still loading, show a stable screen/spinner.
  if (isLoading) {
    return null;
  }

  // If something’s broken in the auth chain, throw or show an error:
  if (isError) {
    // Could do a fallback UI or throw an error.
    throw new Error(
      'Error in auth chain. You can handle it with a custom error boundary or try again.'
    );
  }

  // Otherwise, the user is either loaded & logged in or not.
  // Let the route-based logic handle any final redirects:
  return <>{children}</>;
}

export default CharliApp;
