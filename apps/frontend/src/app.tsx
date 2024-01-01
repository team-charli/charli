import Routes from './Routes/Routes';
import OnboardStateProvider from './contexts/OnboardContext'
import AuthProvider from './contexts/AuthContext'
import UIProvider from './contexts/UIContext';
import SupabaseProvider from './contexts/SupabaseContext';
export function App() {

  return (
    <AuthProvider>
      <OnboardStateProvider>
        <SupabaseProvider>
        <UIProvider>
          <Routes />
        </UIProvider>
      </SupabaseProvider>
      </OnboardStateProvider>
    </AuthProvider>
  );
}

export default App;
