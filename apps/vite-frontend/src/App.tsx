import log from 'loglevel';
export const authChainLogger = log.getLogger('authChainLogger');
authChainLogger.setLevel('info');
export const routingLogger = log.getLogger('routingLogger');
export const mutationLogger = log.getLogger('mutationLogger')
routingLogger.setLevel('info');
mutationLogger.setLevel('info')
authChainLogger.setLevel('silent');
routingLogger.setLevel('silent');

import { Provider } from 'jotai/react';
import '@/styles/globals.css';
import { HuddleProvider } from "@huddle01/react";
import { RouterProvider } from '@tanstack/react-router';
import { huddleClient } from './Huddle/huddleClient';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
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
  deserialize: (cachedString) => {
    const deserialized = JSON.parse(cachedString);
    return deserialized;
  },
  serialize: (client) => {
    const serialized = JSON.stringify(client);
    return serialized;
  },
});


function CharliApp() {
  return (
    <QueryClientProvider client={queryClient} >
      <AuthProvider>
        {(authContext) => (
          <Provider>
            <ReactQueryDevtools initialIsOpen={false} />
            <SessionsProvider>
              <HuddleProvider client={huddleClient}>
                <RouterProvider
                  router={router}
                  context={{
                    auth: authContext,
                    queryClient,
                  } as RouterContext}
                />
              </HuddleProvider>
            </SessionsProvider>
          </Provider>
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}




export default CharliApp;
