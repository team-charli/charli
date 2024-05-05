import AuthMethods from "@/components/Lit/AuthMethods";
import { useSetLoginViewCSS } from "@/hooks/css/useSetLoginViewCSS";
import { LoginViewProps } from "@/types/types";
import { handleDiscordLogin, handleGoogleLogin } from "@/utils/lit";

const LoginView = ({ parentIsRoute }: LoginViewProps) => {
  const { marginTop, flex } = useSetLoginViewCSS(parentIsRoute);
  const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  return (
    <div className={`_LoginMethods_ ${flex} justify-center ${marginTop}`}>
      <AuthMethods handleGoogleLogin={() => handleGoogleLogin(redirectUrl)} handleDiscordLogin={() => handleDiscordLogin(redirectUrl)}/>
    </div>
  );
};

export default LoginView;
