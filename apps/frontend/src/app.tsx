import Routes from './Routes/Routes';
import OnboardStateProvider from './contexts/OnboardContext'
import AuthProvider from './contexts/AuthContext'
import UIProvider from './contexts/UIContext';
import SupabaseProvider from './contexts/SupabaseContext';
export function App() {

  return (
    <AuthProvider>
      <SupabaseProvider>
        <OnboardStateProvider>
          <UIProvider>
            <Routes />
          </UIProvider>
        </OnboardStateProvider>
      </SupabaseProvider>
    </AuthProvider>
  );
}

export default App;
