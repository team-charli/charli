import Routes from './Routes/Routes';
import OnboardStateProvider from './contexts/OnboardContext'
import AuthProvider from './contexts/AuthContext'
import UIProvider from './contexts/UIContext';
import SupabaseProvider from './contexts/SupabaseContext';
import { NetworkProvider } from './contexts/NetworkContext';
export function App() {

  return (
    <NetworkProvider>
      <AuthProvider>
        <SupabaseProvider>
          <OnboardStateProvider>
            <UIProvider>
              <Routes />
            </UIProvider>
          </OnboardStateProvider>
        </SupabaseProvider>
      </AuthProvider>
    </NetworkProvider>
  );
}

export default App;
