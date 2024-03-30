import Routes from './Routes/Routes';
import OnboardStateProvider from './contexts/OnboardContext'
import AuthProvider from './contexts/AuthContext'
import SupabaseProvider from './contexts/SupabaseContext';
import { HuddleProvider } from '@huddle01/react';
import { huddleClient } from './Huddle/huddleClient';
import NotificationProvider from './contexts/NotificationContext';
import SessionProvider from './contexts/SessionsContext';

export function App() {

  return (
    <AuthProvider>
      <SupabaseProvider>
        <NotificationProvider>
          <OnboardStateProvider>
            <HuddleProvider client={huddleClient}>
              <SessionProvider>
                <Routes />
              </SessionProvider>
            </HuddleProvider>
          </OnboardStateProvider>
        </NotificationProvider>
      </SupabaseProvider>
    </AuthProvider>
  );
}

export default App
// <UIProvider>
// </UIProvider>

/* <NetworkProvider> */
/*</NetworkProvider>*/
