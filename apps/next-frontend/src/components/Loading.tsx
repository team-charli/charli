// Loading.tsx
'use client';
import { useEffect, useState } from 'react';
import { useAuthOnboardContext } from "@/contexts";
import AuthMethods from "@/components/Lit/AuthMethods";
import { handleDiscordLogin, handleGoogleLogin } from "@/utils/lit";

interface LoadingProps {
  redirectUrl: string;
}

const Loading = ({ redirectUrl }: LoadingProps) => {
  const { authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError, renderLoginButtons } = useAuthOnboardContext();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    console.log('renderLoginButtons', renderLoginButtons)
  }, [renderLoginButtons])

  if (!isClient) {
    return null;
  }

  if (renderLoginButtons) {
    return (
      <div className={`_LoginMethods_ flex justify-center mt-64`}>
        <AuthMethods handleGoogleLogin={() => handleGoogleLogin(redirectUrl)} handleDiscordLogin={() => handleDiscordLogin(redirectUrl)}/>
      </div>
    );
  }

  return (
    <div className="loading-container">
      {authLoading && <p className={`flex justify-center marginTop`}>Authenticating...</p>}
      {accountsLoading && <p className={`flex justify-center marginTop`}>Loading accounts...</p>}
      {sessionLoading && <p className={`flex justify-center marginTop`}>Initializing session...</p>}
      {authError && <p className="error">{authError.message}</p>}
      {accountsError && <p className="error">{accountsError.message}</p>}
      {sessionError && <p className="error">{sessionError.message}</p>}
    </div>
  );
};

export default Loading;
