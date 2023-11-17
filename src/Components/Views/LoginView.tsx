import { useEffect} from 'react';
import { useHistory } from 'react-router-dom';
import { StateContext } from '../../contexts/StateContext'
import { useContextNullCheck } from  '../../hooks/utils/useContextNullCheck'
import useAuthenticate from '../../hooks/Lit/useLitAuthenticate';
import useSession from '../../hooks/Lit/useLitSession';
import useAccounts from '../../hooks/Lit/useLitAccount';
import {Onboard} from '../../Routes/Onboard/Onboard'
import Lounge from "../../Routes/Lounge/Lounge";
import { signInWithDiscord, signInWithGoogle } from '../../utils/lit';
import LoginMethods from '../../Components/Lit/LoginMethods';
import CreateAccount from '../../Components/Lit/CreateAccountExample';
import { useSetLoginViewCSS } from '../../hooks/css/useSetLoginViewCSS';

interface LoginViewProps {
  parentIsRoute: boolean;
}

const LoginView = ({parentIsRoute}: LoginViewProps) =>  {
  const context = useContextNullCheck(StateContext)
  const {onBoard: {hasOnboarded} } = context;

  const redirectUri = import.meta.env.VITE_LIT_GOOGLE_AUTH_REDIR_URI
  const {
    authMethod,
    error: authError,
  } = useAuthenticate(redirectUri);
  const {
    fetchAccounts,
    currentAccount,
    accounts,
    error: accountsError,
  } = useAccounts();
  const {
    initSession,
    sessionSigs,
    error: sessionError,
  } = useSession();
  const history = useHistory();

  const error = authError || accountsError || sessionError;

  async function handleGoogleLogin() {
    await signInWithGoogle(redirectUri);
  }

  function goToSignUp() {
    history.push('/');
  }

  // If user is authenticated, fetch accounts
  //NOTE: SAME
  useEffect(() => {
    if (authMethod) {
      fetchAccounts(authMethod);
    }
  }, [authMethod, fetchAccounts]);
  //NOTE: SAME
  useEffect(() => {
    // If user is authenticated and has selected an account, initialize session
    if (authMethod && currentAccount) {
      initSession(authMethod, currentAccount);
    }
  }, [authMethod, currentAccount, initSession]);

  // If user is authenticated and has selected an account, check onboard
  //NOTE: same + check if onboarded for signup
  if (currentAccount && sessionSigs && hasOnboarded) {
    return (
       <Lounge />
    );
  } else if (currentAccount && sessionSigs) {
    return (
      <Onboard currentAccount={currentAccount}/>
    );
  }

  //NOTE: Same. CreateAccount redirects to CreateAuth which is same as this
  // If user is authenticated but has no accounts, prompt to create an account
  if (authMethod && accounts.length === 0) {
    return <CreateAccount signUp={goToSignUp} error={error} />;
  }

  const {marginTop, flex} = useSetLoginViewCSS(parentIsRoute)

// If user is not authenticated, show login methods
  return (
    <>
    <div className={`_LoginMethods_ ${flex} justify-center ${marginTop}`}>
    <LoginMethods
      handleGoogleLogin={handleGoogleLogin}
      signUp={goToSignUp}
      error={error}
    />
    </div>
  </>
  );
}

export default LoginView
