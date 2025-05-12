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
import { HuddleProvider } from '@huddle01/react';
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
    <div className="flex flex-col w-full min-h-screen px-3 py-2 sm:px-5 sm:py-3 md:px-8 md:py-4 lg:px-10 lg:py-5 text-sm sm:text-base md:text-base lg:text-lg">
      <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <JotaiProvider>
          <ReactQueryDevtools initialIsOpen={false} />
          <SessionsProvider>
            <HuddleProvider client={huddleClient}>
              {/*
                Keep your AuthGate so you don't render the Router
                until auth is loaded (no flicker).
              */}
              <AuthGate>
                {/*
                  Instead of calling useAuth() here,
                  move it inside a child component:
                */}
                <RouterWrapper />
              </AuthGate>
            </HuddleProvider>
          </SessionsProvider>
        </JotaiProvider>
      </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isError } = useAuth();

  if (isLoading) {
    return null; // or <LoadingScreen/>
  }
  if (isError) {
    throw new Error('Auth chain error');
  }

  return <>{children}</>;
}

/**
 * This child is definitely "inside" <AuthProvider>,
 * so we can safely call useAuth() here without the error.
 */
function RouterWrapper() {
  const auth = useAuth(); // Safe now, we're in the Auth provider tree

  return (
    <RouterProvider
      router={router}
      context={{
        auth,
        queryClient,
      } as RouterContext}
    />
  );
}

export default CharliApp;
