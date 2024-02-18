import Routes from './Routes/Routes';
import OnboardStateProvider from './contexts/OnboardContext'
import AuthProvider from './contexts/AuthContext'
import UIProvider from './contexts/UIContext';
import SupabaseProvider from './contexts/SupabaseContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { HuddleProvider } from '@huddle01/react';
import { huddleClient } from './Huddle/huddleClient';

export function App() {

  return (
    <AuthProvider>
      <SupabaseProvider>
        <OnboardStateProvider>
          <UIProvider>
            <HuddleProvider client={huddleClient}>
              <Routes />
            </HuddleProvider>
          </UIProvider>
        </OnboardStateProvider>
      </SupabaseProvider>
    </AuthProvider>
  );
}

export default App
/* <NetworkProvider> */
/*</NetworkProvider>*/
