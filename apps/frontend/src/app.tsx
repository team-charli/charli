import Routes from './Routes/Routes';
import OnboardStateProvider from './contexts/OnboardContext'
import AuthProvider from './contexts/AuthContext'
import UIProvider from './contexts/UIContext';
import SupabaseProvider from './contexts/SupabaseContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { HuddleProvider } from '@huddle01/react';
import { huddleClient } from './Huddle/huddleClient';
import NotificationProvider from './contexts/NotificationContext';

export function App() {

  return (
    <AuthProvider>
      <SupabaseProvider>
        <NotificationProvider>
          <OnboardStateProvider>
            <HuddleProvider client={huddleClient}>
              <Routes />
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
