import { useEffect} from 'react';
import { useHistory } from 'react-router-dom';
import { LoginViewProps } from '../../types/types'
import { AuthContext } from '../../contexts/AuthContext'
import { UIContext} from '../../contexts/UIContext'
import { useContextNullCheck } from  '../../hooks/utils/useContextNullCheck'
import { signInWithGoogle } from '../../utils/lit';
import LoginMethods from '../../Components/Lit/LoginMethods';
import { useSetLoginViewCSS } from '../../hooks/css/useSetLoginViewCSS';

const LoginView = ({parentIsRoute}: LoginViewProps) =>  {

  const { marginTop, flex } = useSetLoginViewCSS(parentIsRoute);
  const { firedLogin, setFiredLogin } = useContextNullCheck(UIContext);
  const { authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError } = useContextNullCheck(AuthContext)
  const history = useHistory();
  const error = authError || accountsError || sessionError;

  async function handleGoogleLogin() {
    setFiredLogin(true);
    await signInWithGoogle(import.meta.env.VITE_GOOGLE_REDIRECT_URI);
  }

  function goToSignUp() {
    history.push('/');
  }

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
  } else if (authMethod || firedLogin){
    return null
  } else {
    return loginMethods
  }
}
export default LoginView
//FIX: Buttons still flashing on login
