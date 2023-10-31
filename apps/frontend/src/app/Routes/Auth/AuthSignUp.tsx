import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import useAuthenticate from '../../hooks/Lit/useLitAuthenticate';
import useSession from '../../hooks/Lit/useLitSession';
import useAccounts from '../../hooks/Lit/useLitAccount';
import {
  ORIGIN,
  registerWebAuthn,
  signInWithDiscord,
  signInWithGoogle,
} from '../../utils/lit';
import { AuthMethodType } from '@lit-protocol/constants';
import SignUpMethods from '../../Components/Lit/SignUpMethods';
import Dashboard from '../../Components/Lit/DashBoardExample';
import Loading from '../../Components/Lit/LoadingExample';

export default function AuthSignUp() {
  const redirectUri = ORIGIN;

  const {
    authMethod,
    // authWithEthWallet,
    // authWithOTP,
    // authWithWebAuthn,
    // authWithStytch,
    loading: authLoading,
    error: authError,
  } = useAuthenticate(redirectUri);
  const {
    createAccount,
    setCurrentAccount,
    currentAccount,
    loading: accountsLoading,
    error: accountsError,
  } = useAccounts();
  const {
    initSession,
    sessionSigs,
    loading: sessionLoading,
    error: sessionError,
  } = useSession();
  const history = useHistory();

  const error = authError || accountsError || sessionError;

  async function handleGoogleLogin() {
    await signInWithGoogle(redirectUri);
  }

  async function handleDiscordLogin() {
    await signInWithDiscord(redirectUri);
  }

  async function registerWithWebAuthn() {
    const newPKP = await registerWebAuthn();
    if (newPKP) {
      setCurrentAccount(newPKP);
    }
  }

  useEffect(() => {
    // If user is authenticated, create an account
    // For WebAuthn, the account creation is handled by the registerWithWebAuthn function
    if (authMethod && authMethod.authMethodType !== AuthMethodType.WebAuthn) {
      //router.replace(window.location.pathname, undefined, { shallow: true });
      createAccount(authMethod);
    }
  }, [authMethod, createAccount]);

  useEffect(() => {
    //TODO: in this system users can't have more than one account
    // If user is authenticated and has at least one account, initialize session
    if (authMethod && currentAccount) {
      initSession(authMethod, currentAccount);
    }
  }, [authMethod, currentAccount, initSession]);

  if (authLoading) {
    return (
      <Loading copy={'Authenticating your credentials...'} error={error} />
    );
  }

  if (accountsLoading) {
    return <Loading copy={'Creating your account...'} error={error} />;
  }

  if (sessionLoading) {
    return <Loading copy={'Securing your session...'} error={error} />;
  }

  if (currentAccount && sessionSigs) {
    return (
      <Dashboard currentAccount={currentAccount} sessionSigs={sessionSigs} />
    );
  } else {
    return (
      <SignUpMethods
        handleGoogleLogin={handleGoogleLogin}
        handleDiscordLogin={handleDiscordLogin}
        registerWithWebAuthn={registerWithWebAuthn}
        goToLogin={() => history.push('/login')}
        error={error}
      />
    );
  }
}

// <SignUpMethods
//   handleGoogleLogin={handleGoogleLogin}
//   handleDiscordLogin={handleDiscordLogin}
//   authWithEthWallet={authWithEthWallet}
//   authWithOTP={authWithOTP}
//   registerWithWebAuthn={registerWithWebAuthn}
//   authWithWebAuthn={authWithWebAuthn}
//   authWithStytch={authWithStytch}
//   goToLogin={() => history.push('/login')}
//   error={error}
// />
