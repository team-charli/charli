'use client';
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import { useAuthOnboardContext } from "@/contexts";
import { useEffect, useState } from 'react';
import LoginView from "./Components/LoginView";
import Loading from "@/components/Loading";

const Login = () => {
  const [hydrated, setHydrated] = useState(false);
  const { renderLoginButtons, authLoading, accountsLoading, sessionLoading } = useAuthOnboardContext();

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    // Render a placeholder or loading state on the server-side
    return null;
  }

  return (
    <>
      <IconHeader />
      <BannerHeader />
      {renderLoginButtons ? (
        <LoginView parentIsRoute={true} />
      ) : (
        <Loading />
      )}
    </>
  );
};

export default Login;
