import Routes from './Routes/Routes';
import OnboardStateProvider from './contexts/OnboardContext'
import AuthProvider from './contexts/AuthContext'
import UIProvider from './contexts/UIContext';

export function App() {

  return (
    <AuthProvider>
      <OnboardStateProvider>
        <UIProvider>
          <Routes />
        </UIProvider>
      </OnboardStateProvider>
    </AuthProvider>
  );
}

export default App;
