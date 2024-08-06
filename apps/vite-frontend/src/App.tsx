import log from 'loglevel';
export const authChainLogger = log.getLogger('authChainLogger');
authChainLogger.setLevel('info');
export const routingLogger = log.getLogger('routingLogger');
routingLogger.setLevel('info');
authChainLogger.setLevel('silent');
import { Provider } from 'jotai/react';
import '@/styles/globals.css';
import { HuddleProvider } from "@huddle01/react";
import { RouterProvider } from '@tanstack/react-router';
import { huddleClient } from './Huddle/huddleClient';
import NotificationProvider from './contexts/NotificationContext';
import SessionProvider from "./contexts/SessionsContext";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { router, RouterContext } from './TanstackRouter/router';
import { queryClient, persister } from './TanstackQuery/queryClient';


function CharliApp() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <AuthProvider>
        {(authContext) => (
          <Provider>
            <ReactQueryDevtools initialIsOpen={false} />
            <NotificationProvider>
              <HuddleProvider client={huddleClient}>
                <SessionProvider>
                  <RouterProvider
                    router={router}
                    context={{
                      auth: authContext,
                      queryClient
                    } as RouterContext}
                  />
                </SessionProvider>
              </HuddleProvider>
            </NotificationProvider>
          </Provider>
        )}
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

export default CharliApp;
