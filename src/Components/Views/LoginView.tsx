import { useEffect} from 'react';
import { useHistory } from 'react-router-dom';
import { StateContext } from '../../contexts/StateContext'
import { useContextNullCheck } from  '../../hooks/utils/useContextNullCheck'
import useAuthenticate from '../../hooks/Lit/useLitAuthenticate';
import useSession from '../../hooks/Lit/useLitSession';
import useAccounts from '../../hooks/Lit/useLitAccount';
import {Onboard} from '../../Routes/Onboard/Onboard'
import Lounge from "../../Routes/Lounge/Lounge";
import { signInWithGoogle } from '../../utils/lit';
import LoginMethods from '../../Components/Lit/LoginMethods';
import { useSetLoginViewCSS } from '../../hooks/css/useSetLoginViewCSS';

interface LoginViewProps {
  parentIsRoute: boolean;
}
//NOTE: Auth components are stable; Lit is not; Do the following until it is:
//TODO: Handle other todo's
//TODO: Implement other sign in methods? No but add a second button with the Android logo with the same handler as the google account
//TODO: Build out remaining UI
//TODO: Put together streaming with UI enhancements
//TODO: Write Smart Contracts

const LoginView = ({parentIsRoute}: LoginViewProps) =>  {
  const {onBoard: {hasOnboarded} } = useContextNullCheck(StateContext)

  const redirectUri = import.meta.env.VITE_LIT_GOOGLE_AUTH_REDIR_URI
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
  const history = useHistory();

  const error = authError || accountsError || sessionError;

  async function handleGoogleLogin() {
    await signInWithGoogle(redirectUri);
  }

  function goToSignUp() {
    history.push('/');
  }

  // If user is authenticated, fetch accounts
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

  // If user is authenticated and has selected an account, check onboard
  if (currentAccount && sessionSigs && hasOnboarded) {
    return (
       <Lounge />
    );
  } else if (currentAccount && sessionSigs) {
    return (
      <Onboard currentAccount={currentAccount}/>
    );
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
