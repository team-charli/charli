import dynamic from 'next/dynamic';
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import { useAuthOnboardContext } from "@/contexts";
import { useEffect } from 'react';
const LoginView = dynamic(() => import('./Components/LoginView'), { ssr: false });
const Loading = dynamic(() => import('@/components/Loading'), { ssr: false });

const Login = () => {
  const { authLoading, accountsLoading, sessionLoading, renderLoginButtons } = useAuthOnboardContext();

  useEffect(() => {
    if( authLoading || accountsLoading || sessionLoading) {
      console.log("loading: ", authLoading || accountsLoading || sessionLoading)
    }
  }, [ authLoading, accountsLoading, sessionLoading])

  if (renderLoginButtons) {
    return (
      <>
        <IconHeader />
        <BannerHeader />
        <LoginView parentIsRoute={true}  />
      </>
    );
  } else {
    return (
      <>
        <IconHeader />
        <BannerHeader />
        <Loading />
      </>
    );
  }
};

export default Login;

