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
//TODO: Implement other sign in methods? No but add a second button with the Android logo with the same handler as the google account
//TODO: Build out remaining UI
//TODO: Put together streaming with UI enhancements
//TODO: Write Smart Contracts

const LoginView = ({parentIsRoute}: LoginViewProps) =>  {
  const {onBoard: {hasOnboarded} } = useContextNullCheck(StateContext)

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
  const history = useHistory();
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
      console.log('has auth method')
      fetchAccounts(authMethod);
    }
  }, [authMethod, fetchAccounts]);

  useEffect(() => {
    // If user is authenticated and has selected an account, initialize session
    if (authMethod && currentAccount) {
      initSession(authMethod, currentAccount);
    }
  }, [authMethod, currentAccount, initSession]);


let content;
  if (currentAccount && sessionSigs && hasOnboarded) {
    content = <Lounge />;
  }
  else if (currentAccount && sessionSigs) {
    content = <Onboard currentAccount={currentAccount} sessionSigs={sessionSigs}/>;
  }
  else {
    content = (
      <div className={`_LoginMethods_ ${flex} justify-center ${marginTop}`}>
        <LoginMethods handleGoogleLogin={handleGoogleLogin} signUp={goToSignUp} error={error} />
      </div>
    );
  }
  return content
 }

export default LoginView
