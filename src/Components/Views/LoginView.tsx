import { useEffect} from 'react';
import { LoginViewProps } from '../../types/types'
import { useHistory } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext'
import { StateContext } from '../../contexts/StateContext'
import { UIContext} from '../../contexts/UIContext'
import { useContextNullCheck } from  '../../hooks/utils/useContextNullCheck'
import useAuthenticate from '../../hooks/Lit/useLitAuthenticate';
import useSession from '../../hooks/Lit/useLitSession';
import useAccounts from '../../hooks/Lit/useLitAccount';
import { signInWithGoogle } from '../../utils/lit';
import LoginMethods from '../../Components/Lit/LoginMethods';
import { useSetLoginViewCSS } from '../../hooks/css/useSetLoginViewCSS';

const LoginView = ({parentIsRoute}: LoginViewProps) =>  {
  const history = useHistory();
  const {marginTop, flex} = useSetLoginViewCSS(parentIsRoute);
  const {isAuthenticated} = useContextNullCheck(AuthContext);
  const {isOnboarded} = useContextNullCheck(StateContext);
  const {firedLogin, setFiredLogin} = useContextNullCheck(UIContext);

  const redirectUri = "http://localhost:5173/login"
  const {
    authMethod,
    error: authError,
    loading: authLoading,
  } = useAuthenticate(redirectUri);
  const {
    fetchAccounts,
    currentAccount,
    error: accountsError,
    loading: accountsLoading,
  } = useAccounts();
  const {
    initSession,
    sessionSigs,
    loading: sessionLoading,
    error: sessionError,
  } = useSession();

  const error = authError || accountsError || sessionError;

  async function handleGoogleLogin() {
    setFiredLogin(true);
    await signInWithGoogle(redirectUri);
  }

  function goToSignUp() {
    history.push('/');
  }

  useEffect(() => {
    if (authMethod) {
      fetchAccounts(authMethod);
    }
  }, [authMethod, fetchAccounts]);

  useEffect(() => {
    if (authMethod && currentAccount) {
      initSession(authMethod, currentAccount);
    }
  }, [authMethod, currentAccount, initSession]);

  useEffect(() => {
    if (isAuthenticated) {
      if (!isOnboarded) {
        // Redirect to Lounge with state
       history.push('/onboard', { currentAccount, sessionSigs });
      } else {
        // Redirect to Onboard with state
      history.push('/lounge', { currentAccount, sessionSigs });
      }
    }
  }, [isAuthenticated, isOnboarded, history]);

  let loginMethods =  (
    <div className={`_LoginMethods_ ${flex} justify-center ${marginTop}`}>
      <LoginMethods handleGoogleLogin={handleGoogleLogin} signUp={goToSignUp} error={error} />
    </div>
  );


<p className={`${flex} justify-center ${marginTop}`}>auth loading</p>
  if (authLoading) {
    return <p className={`${flex} justify-center ${marginTop}`}>auth loading</p>
  } else if (accountsLoading) {
    return <p className={`${flex} justify-center ${marginTop}`}>accounts loading</p>
  } else if (sessionLoading) {
    return <p className={`${flex} justify-center ${marginTop}`}>session loading</p>
  } else if (isAuthenticated || firedLogin){
    return null
  } else {
    return loginMethods
  }
}
export default LoginView
//FIX: Buttons still flashing on login
