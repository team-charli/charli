import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { StateContext } from '../../contexts/StateContext'
import { useContextNullCheck } from  '../../hooks/utils/useContextNullCheck'
import useAuthenticate from '../../hooks/Lit/useLitAuthenticate';
import useSession from '../../hooks/Lit/useLitSession';
import useAccounts from '../../hooks/Lit/useLitAccount';
import {Onboard} from '../Onboard/Onboard'
import Lounge from "../../Routes/Lounge/Lounge";
import { ORIGIN, signInWithDiscord, signInWithGoogle } from '../../utils/lit';
import Loading from '../../Components/Lit/LoadingExample';
import LoginMethods from '../../Components/Lit/LoginMethods';
import AccountSelection from '../../Components/Lit/AccountSelectionExample';
import CreateAccount from '../../Components/Lit/CreateAccountExample';

export default function LoginView() {
  const context = useContextNullCheck(StateContext)
  const {onBoard: {hasOnboarded} } = context;

  const redirectUri = import.meta.env.VITE_LIT_GOOGLE_AUTH_REDIR_URI
  console.log({redirectUri})
  const {
    authMethod,
    loading: authLoading,
    error: authError,
  } = useAuthenticate(redirectUri);
  const {
    fetchAccounts,
    setCurrentAccount,
    currentAccount,
    accounts,
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

  function goToSignUp() {
    history.push('/');
  }

  useEffect(() => {
    // If user is authenticated, fetch accounts
    if (authMethod) {
      // if (authMethod.authMethodType === AuthMethodType.Discord) {
      //   console.log('discord', authMethod);
      //   fetchDiscord(authMethod);
      // }
      fetchAccounts(authMethod);
    }
  }, [authMethod, fetchAccounts]);

  useEffect(() => {
    // If user is authenticated and has selected an account, initialize session
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
    return <Loading copy={'Looking up your accounts...'} error={error} />;
  }

  if (sessionLoading) {
    return <Loading copy={'Securing your session...'} error={error} />;
  }

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

  // If user is authenticated and has more than 1 account, show account selection
  if (authMethod && accounts.length > 0) {
    return (
      <AccountSelection
        accounts={accounts}
        setCurrentAccount={setCurrentAccount}
        error={error}
      />
    );
  }

  // If user is authenticated but has no accounts, prompt to create an account
  if (authMethod && accounts.length === 0) {
    return <CreateAccount signUp={goToSignUp} error={error} />;
  }

  // If user is not authenticated, show login methods
  return (
    <LoginMethods
      handleGoogleLogin={handleGoogleLogin}
      handleDiscordLogin={handleDiscordLogin}
      signUp={goToSignUp}
      error={error}
    />
  );
}

