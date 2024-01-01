
import { LoginViewProps } from '../../types/types'
import { signInWithGoogle } from '../../utils/lit';
import { useSetLoginViewCSS } from '../../hooks/css/useSetLoginViewCSS';
import AuthMethods from '../Lit/AuthMethods';
import { AuthContext } from '../../contexts/AuthContext'
import { UIContext} from '../../contexts/UIContext'
import { useContextNullCheck } from  '../../hooks/utils/useContextNullCheck'
import { useRouteRedirect } from '../../hooks/useRouteRedirect';

const LoginView = ({parentIsRoute}: LoginViewProps) =>  {
  const { marginTop, flex } = useSetLoginViewCSS(parentIsRoute);

  const { firedLogin, setFiredLogin } = useContextNullCheck(UIContext);
  const { authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError } = useContextNullCheck(AuthContext)
  const error = authError || accountsError || sessionError;
  useRouteRedirect();

  async function handleGoogleLogin() {
    console.log('handle Google login called');
    await signInWithGoogle(import.meta.env.VITE_GOOGLE_REDIRECT_URI);
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
      <AuthMethods handleGoogleLogin={handleGoogleLogin}/>
    </div>
  );
  }
export default LoginView
