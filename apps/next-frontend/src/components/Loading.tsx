// Loading.tsx
'use client';
import { authenticateAtom, fetchLitAccountsAtom, litSessionAtom, renderLoginButtonsAtom, signInInitiatedAtom } from "@/atoms";
import AuthMethods from "@/components/Lit/AuthMethods";
import { useAuthOnboardContext } from "@/contexts/AuthOnboardContext";
import {signInWithDiscord, signInWithGoogle } from "@/utils/lit";
import { useAtom } from "jotai";

interface LoadingProps {
  redirectUrl: string;
}

const Loading = ({ redirectUrl }: LoadingProps) => {
  const [{ isLoading: authLoading, error: authError }] = useAtom(authenticateAtom);
  const [{ isLoading: accountsLoading, error: accountsError }] = useAtom(fetchLitAccountsAtom);
  const [{ isLoading: sessionSigsLoading, error: sessionError }] = useAtom(litSessionAtom);
  const [_, setSignInInitiated] = useAtom(signInInitiatedAtom);
  const [__,setRenderLoginButtons] = useAtom(renderLoginButtonsAtom);

  const handleGoogleLogin = async () => {
    setSignInInitiated(true);
    await signInWithGoogle(process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!);
    setRenderLoginButtons(false);
  };

  const handleDiscordLogin = async () => {
    setSignInInitiated(true);
    await signInWithDiscord(process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI!);
    setRenderLoginButtons(false);
  };

  return (
    <>
      <div className="loading-container">
        {authLoading && <p className={`flex justify-center marginTop`}>Authenticating...</p>}
        {accountsLoading && <p className={`flex justify-center marginTop`}>Loading accounts...</p>}
        {sessionSigsLoading && <p className={`flex justify-center marginTop`}>Initializing session...</p>}
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
