import { useEffect} from 'react';
import { useHistory } from 'react-router-dom';
import { StateContext } from '../../contexts/StateContext'
import { AuthContext } from '../../contexts/AuthContext'
import { useContextNullCheck } from  '../../hooks/utils/useContextNullCheck'
import useAuthenticate from '../../hooks/Lit/useLitAuthenticate';
import useSession from '../../hooks/Lit/useLitSession';
import useAccounts from '../../hooks/Lit/useLitAccount';
import { signInWithGoogle } from '../../utils/lit';
import LoginMethods from '../../Components/Lit/LoginMethods';
import { useSetLoginViewCSS } from '../../hooks/css/useSetLoginViewCSS';

interface LoginViewProps {
  parentIsRoute: boolean;
}

const LoginView = ({parentIsRoute}: LoginViewProps) =>  {
  const {isAuthenticated} = useContextNullCheck(AuthContext);
  const {onBoard: {hasOnboarded} } = useContextNullCheck(StateContext)
  const history = useHistory();

  const redirectUri = "http://localhost:5173/login"
  const {
    authMethod,
    error: authError,
  } = useAuthenticate(redirectUri);
  const {
    fetchAccounts,
    currentAccount,
    error: accountsError,
  } = useAccounts();
  const {
    initSession,
    sessionSigs,
    error: sessionError,
  } = useSession();
  const {marginTop, flex} = useSetLoginViewCSS(parentIsRoute);

  const error = authError || accountsError || sessionError;

  async function handleGoogleLogin() {
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
    // If user is authenticated and has selected an account, initialize session
    if (authMethod && currentAccount) {
      initSession(authMethod, currentAccount);
    }
  }, [authMethod, currentAccount, initSession]);

  useEffect(() => {
    if (isAuthenticated) {
      if (!hasOnboarded) {
        // Redirect to Lounge with state
       history.push('/onboard', { currentAccount, sessionSigs });
      } else {
        // Redirect to Onboard with state
      history.push('/lounge', { currentAccount, sessionSigs });
      }
    }
  }, [isAuthenticated, hasOnboarded, history]);

  let content = (
    <div className={`_LoginMethods_ ${flex} justify-center ${marginTop}`}>
      <LoginMethods handleGoogleLogin={handleGoogleLogin} signUp={goToSignUp} error={error} />
    </div>
  );

  if (currentAccount, sessionSigs){
    return null
  } else {

    return content
  }
}
export default LoginView

//FIX: Flashes Login-Icons after clicking one of them
//FIX: Clicking "Learn" -> Login Icon -> "Onboard Teach"
