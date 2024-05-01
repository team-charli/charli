
import AuthMethods from "@/components/Lit/AuthMethods";
import { useAuthContext, useOnboardContext } from "@/contexts";
import { useSetLoginViewCSS } from "@/hooks/css/useSetLoginViewCSS";
import { LoginViewProps } from "@/types/types";
import { handleDiscordLogin, handleGoogleLogin, signInWithDiscord, signInWithGoogle } from "@/utils/lit";
import { useRouter } from "next/router";
import { useEffect } from "react";

const LoginView = ({parentIsRoute}: LoginViewProps) => {
  const { marginTop, flex } = useSetLoginViewCSS(parentIsRoute);
  const { authMethod, authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError, isLitLoggedIn } = useAuthContext();
  const {onboardMode, isOnboarded} = useOnboardContext();
  const router = useRouter();

  useEffect(()=> {
    console.log("onboardMode", onboardMode)
  }, [onboardMode])

  const error = authError || accountsError || sessionError;

  const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  useEffect(()=> {
    if (error) {
      console.log(error);
      throw new Error();
    }
  }, [error])


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

  if (onboardMode !== 'Teach' && onboardMode !== "Learn" && isLitLoggedIn && !isOnboarded) {
    console.log({onboardMode});
    (async () => {
      console.log('push to /');
      await router.push('/');
    })();
  } else if (onboardMode !== 'Teach' && onboardMode !== "Learn" && isLitLoggedIn && isOnboarded) {
    (async () => {
      console.log('push to /lounge');
      await router.push('/lounge');
    })();
  }

  return (
    <div className={`_LoginMethods_ ${flex} justify-center ${marginTop}`}>
      <AuthMethods handleGoogleLogin={() => handleGoogleLogin(redirectUrl)} handleDiscordLogin={() => handleDiscordLogin(redirectUrl)}/>
    </div>
  );
}

export default LoginView
