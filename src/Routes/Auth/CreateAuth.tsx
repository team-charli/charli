import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import Lounge from '../Lounge/Lounge'
import useAuthenticate from '../../hooks/Lit/useLitAuthenticate';
import useSession from '../../hooks/Lit/useLitSession';
import useAccounts from '../../hooks/Lit/useLitAccount';
import {
  ORIGIN,
  signInWithGoogle,
} from '../../utils/lit';
import { AuthMethodType } from '@lit-protocol/constants';
import SignUpMethods from '../../Components/Lit/SignUpMethods';

const CreateAuth = () => {
  const redirectUri = ORIGIN;

  const {
    authMethod,
    error: authError,
  } = useAuthenticate(redirectUri);
  const {
    createAccount,
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

  // If user is authenticated, create an account
  //NOTE: SAME
  useEffect(() => {
    if (authMethod && authMethod.authMethodType !== AuthMethodType.WebAuthn) {
      //router.replace(window.location.pathname, undefined, { shallow: true });
      createAccount(authMethod);
    }
  }, [authMethod, createAccount]);
  //NOTE: SAME
  useEffect(() => {
    // If user is authenticated and has at least one account, initialize session
    if (authMethod && currentAccount) {
      initSession(authMethod, currentAccount);
    }
  }, [authMethod, currentAccount, initSession]);

  if (currentAccount && sessionSigs) {
    return (
      <Lounge />
    );
  } else {
    return (
      <SignUpMethods
        handleGoogleLogin={handleGoogleLogin}
        goToLogin={() => history.push('/login')}
        error={error}
      />
    );
  }
}
export default CreateAuth
