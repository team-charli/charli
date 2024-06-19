'use client'
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import Loading from "@/components/Loading";


const Login = () => {

  const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;
  return (
    <>
      <IconHeader />
      <BannerHeader />
      <Loading redirectUrl={redirectUrl} />
    </>
  );
};

export default Login;
