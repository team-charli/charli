import Routes from './Routes/Routes';
import StateProvider from './contexts/StateContext'
import AuthProvider from './contexts/AuthContext'
import UIProvider from './contexts/UIContext';

export function App() {

  return (
    <AuthProvider>
      <StateProvider>
        <UIProvider>
          <Routes />
        </UIProvider>
      </StateProvider>
    </AuthProvider>
  );
}

export default App;
