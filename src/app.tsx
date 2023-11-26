import Routes from './Routes/Routes';
import StateProvider from './contexts/StateContext'
import AuthProvider from './contexts/AuthContext'

export function App() {

  return (
    <StateProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </StateProvider>
  );
}

export default App;
