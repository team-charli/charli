import { LoginViewProps } from '../../types/types'
import { signInWithDiscord, signInWithGoogle } from '../../utils/lit';
import { useSetLoginViewCSS } from '../../hooks/css/useSetLoginViewCSS';
import AuthMethods from '../Lit/AuthMethods';
import { useAuthContext } from '../../contexts/AuthContext'
import { UIContext} from '../../contexts/UIContext'
import { useOnboardContext } from '../../contexts/OnboardContext';
import { useContextNullCheck } from  '../../hooks/utils/useContextNullCheck'
import { useRouteRedirect } from '../../hooks/useRouteRedirect';
import { useNetwork } from '../../contexts/NetworkContext';

const LoginView = ({parentIsRoute}: LoginViewProps) =>  {
  const { marginTop, flex } = useSetLoginViewCSS(parentIsRoute);

  const { firedLogin } = useContextNullCheck(UIContext);
  const { authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError } = useAuthContext();
  const {onboardMode} = useOnboardContext();
  const error = authError || accountsError || sessionError;
  useRouteRedirect();
  const { isOnline } = useNetwork();

  async function handleGoogleLogin() {
    if (isOnline) {
      await signInWithGoogle(import.meta.env.VITE_GOOGLE_REDIRECT_URI);
    }
  }

  async function handleDiscordLogin() {
    if (isOnline) {
      await signInWithDiscord(import.meta.env.VITE_GOOGLE_REDIRECT_URI)
    }
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

  if (!onboardMode) {
    return 'loading'
  }

  return (
    <div className={`_LoginMethods_ ${flex} justify-center ${marginTop}`}>
      <AuthMethods handleGoogleLogin={handleGoogleLogin} handleDiscordLogin={handleDiscordLogin}/>
    </div>
  );
}
export default LoginView
