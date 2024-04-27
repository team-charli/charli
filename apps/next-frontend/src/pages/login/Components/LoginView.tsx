import AuthMethods from "@/components/Lit/AuthMethods";
import { useAuthContext, useOnboardContext } from "@/contexts";
import { useSetLoginViewCSS } from "@/hooks/css/useSetLoginViewCSS";
import { LoginViewProps } from "@/types/types";
import { signInWithDiscord, signInWithGoogle } from "@/utils/lit";

const LoginView = ({parentIsRoute}: LoginViewProps) =>  {
  const { marginTop, flex } = useSetLoginViewCSS(parentIsRoute);

  const { authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError } = useAuthContext();
  const { onboardMode } = useOnboardContext();
  const error = authError || accountsError || sessionError;
  const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  async function handleGoogleLogin() {
    if (redirectUrl) {
      await signInWithGoogle(redirectUrl );
    } else {
      throw new Error(`redirectUrl undefined`)
    }
  }

  async function handleDiscordLogin() {
    if (redirectUrl) {
      await signInWithDiscord(redirectUrl)
    }else {
      throw new Error(`redirectUrl undefined`)
    }
  }

  const loadingMessage = authLoading ? 'auth loading'
    : accountsLoading ? 'accounts loading'
      : sessionLoading ? 'session loading'
        : null;

  if (loadingMessage) {
    return <p className={`${flex} justify-center ${marginTop}`}>{loadingMessage}</p>;
  }

  if (authMethod) {
    return null;
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

