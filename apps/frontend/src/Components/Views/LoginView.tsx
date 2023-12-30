import { useEffect} from 'react';
import { useHistory } from 'react-router-dom';
import { LoginViewProps } from '../../types/types'
import { AuthContext } from '../../contexts/AuthContext'
import { UIContext} from '../../contexts/UIContext'
import { useContextNullCheck } from  '../../hooks/utils/useContextNullCheck'
import { signInWithGoogle } from '../../utils/lit';
import LoginMethods from '../../Components/Lit/LoginMethods';
import { useSetLoginViewCSS } from '../../hooks/css/useSetLoginViewCSS';
import { useRouteRedirect } from '../../hooks/useRouteRedirect';

const LoginView = ({parentIsRoute}: LoginViewProps) =>  {

  const { marginTop, flex } = useSetLoginViewCSS(parentIsRoute);
  const { firedLogin, setFiredLogin } = useContextNullCheck(UIContext);
  const { authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError } = useContextNullCheck(AuthContext)
  const history = useHistory();
  const error = authError || accountsError || sessionError;
  useRouteRedirect();

  async function handleGoogleLogin() {
    setFiredLogin(true);
    await signInWithGoogle(import.meta.env.VITE_GOOGLE_REDIRECT_URI, history);
  }

  function goToSignUp() {
    history.push('/');
  }

const loadingMessage = authLoading ? 'auth loading'
                  : accountsLoading ? 'accounts loading'
                  : sessionLoading ? 'session loading'
                  : null;

if (loadingMessage) {
  return <p className={`${flex} justify-center ${marginTop}`}>{loadingMessage}</p>;
}

if (authMethod || firedLogin) {
  return null;
    //FIX: Buttons still flashing on login
}

return (
  <div className={`_LoginMethods_ ${flex} justify-center ${marginTop}`}>
    <LoginMethods handleGoogleLogin={handleGoogleLogin} signUp={goToSignUp} error={error} />
  </div>
);
}
export default LoginView
