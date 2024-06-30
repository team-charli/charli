'use client'
import { authenticateAtom, fetchLitAccountsAtom, litSessionAtom} from "@/atoms";
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import AuthMethods from "@/components/Lit/AuthMethods";
import { useAtom } from "jotai";


const Login = () => {


  const [{ isLoading: authLoading, error: authError }] = useAtom(authenticateAtom);
  const [{ isLoading: accountsLoading, error: accountsError }] = useAtom(fetchLitAccountsAtom);
  const [{ isLoading: sessionSigsLoading, error: sessionError }] = useAtom(litSessionAtom);

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
        {sessionError && <p className="error">{sessionError.message}</p>}
        <div className={`_LoginMethods_ flex justify-center mt-64`}>
          <AuthMethods />
        </div>
      </div>

    </>
  );
};

export default Login;
