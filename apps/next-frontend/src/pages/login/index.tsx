'use client'
import { accountsErrorAtom, accountsLoadingAtom, authErrorAtom, authLoadingAtom, sessionSigsLoadingAtom } from "@/atoms/atoms";
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import AuthMethods from "@/components/Lit/AuthMethods";
import { useAtom, useAtomValue } from "jotai";


const Login = () => {
const authLoading = useAtomValue(authLoadingAtom);
const accountsLoading = useAtomValue(accountsLoadingAtom);
const sessionSigsLoading = useAtomValue(sessionSigsLoadingAtom);
const authError = useAtomValue(authErrorAtom);
const accountsError = useAtomValue(accountsErrorAtom);
const sessionError = useAtomValue(sessionSigsLoadingAtom);
  return (
    <>
      <IconHeader />
      <BannerHeader />
      <div className="loading-container">
        {authLoading && <p className={`flex justify-center marginTop`}>Authenticating...</p>}
        {accountsLoading && <p className={`flex justify-center marginTop`}>Loading accounts...</p>}
        {sessionSigsLoading && <p className={`flex justify-center marginTop`}>Initializing session...</p>}
        {authError && <p className="error">{authError.message}</p>}
        {accountsError && <p className="error">{accountsError.message}</p>}
        {sessionError && <p className="error">{sessionError}</p>}
        <div className={`_LoginMethods_ flex justify-center mt-64`}>
          <AuthMethods />
        </div>
      </div>

    </>
  );
};

export default Login;
