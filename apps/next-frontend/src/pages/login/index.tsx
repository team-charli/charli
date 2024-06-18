'use client'
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import Loading from "@/components/Loading";
import { litNodeClient } from "@/utils/litClients";
import { useEffect } from "react";


const Login = () => {
  const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;
  useEffect(() => {
    void (async () => {
      await litNodeClient.connect()
      // console.log('litNodeClient.ready', litNodeClient.ready)
    })();
  }, [litNodeClient])

  return (
    <>
      <IconHeader />
      <BannerHeader />
      <Loading redirectUrl={redirectUrl} />
    </>
  );
};

export default Login;
