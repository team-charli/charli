// Loading.tsx
'use client';
import { useAuthOnboardContext } from "@/contexts";
import AuthMethods from "@/components/Lit/AuthMethods";
import { handleDiscordLogin, handleGoogleLogin } from "@/utils/lit";

interface LoadingProps {
  redirectUrl: string;
}

const Loading = ({ redirectUrl }: LoadingProps) => {
  const { authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError } = useAuthOnboardContext();

  return (
    <>
      <div className="loading-container">
        {authLoading && <p className={`flex justify-center marginTop`}>Authenticating...</p>}
        {accountsLoading && <p className={`flex justify-center marginTop`}>Loading accounts...</p>}
        {sessionLoading && <p className={`flex justify-center marginTop`}>Initializing session...</p>}
        {authError && <p className="error">{authError.message}</p>}
        {accountsError && <p className="error">{accountsError.message}</p>}
        {sessionError && <p className="error">{sessionError.message}</p>}
        <div className={`_LoginMethods_ flex justify-center mt-64`}>
          <AuthMethods handleGoogleLogin={() => handleGoogleLogin(redirectUrl)} handleDiscordLogin={() => handleDiscordLogin(redirectUrl)}/>
        </div>

      </div>
    </>
  );
};

export default Loading;
