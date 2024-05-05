import { useAuthOnboardContext } from "@/contexts";
import { useEffect } from "react";

const Loading = () => {
  const { authLoading, accountsLoading, sessionLoading, authError, accountsError, sessionError } = useAuthOnboardContext();

  let loadingMessage = null;

  if (authLoading) {
    loadingMessage = 'Authenticating...';
  } else if (accountsLoading) {
    loadingMessage = 'Loading accounts...';
  } else if (sessionLoading) {
    loadingMessage = 'Initializing session...';
  }
  useEffect(() => {
    // if( authLoading || accountsLoading || sessionLoading) {
      console.log({authLoading, accountsLoading, sessionLoading})
    // }
  }, [ authLoading, accountsLoading, sessionLoading])

  return (
    <div className="loading-container">
      {loadingMessage && <p className={`flex justify-center marginTop`}>{loadingMessage}</p>}
      {authError && <p className="error">{authError.message}</p>}
      {accountsError && <p className="error">{accountsError.message}</p>}
      {sessionError && <p className="error">{sessionError.message}</p>}
    </div>
  );
};

export default Loading;
