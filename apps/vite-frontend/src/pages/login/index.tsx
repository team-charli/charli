//src/pages/login/index.js
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import AuthMethods from "@/components/Lit/AuthMethods";
import { useLitNodeClientReady, useLitAuthMethod, useLitAccount, useSessionSigs } from '@/contexts/AuthContext';

const Login = () => {
  const litNodeClientReady = useLitNodeClientReady();
  const litAuthMethod = useLitAuthMethod();
  const litAccount = useLitAccount();
  const sessionSigs = useSessionSigs();

  return (
    <>
      <IconHeader />
      <BannerHeader />
      <div className="loading-container">
        {litAuthMethod.isLoading && <p className={`flex justify-center marginTop`}>Authenticating...</p>}
        {litAccount.isLoading && <p className={`flex justify-center marginTop`}>Loading accounts...</p>}
        {sessionSigs.isLoading && <p className={`flex justify-center marginTop`}>Initializing session...</p>}
        <div className={`_LoginMethods_ flex justify-center mt-64`}>
          <AuthMethods />
        </div>
      </div>
    </>
  );
};

export default Login;
