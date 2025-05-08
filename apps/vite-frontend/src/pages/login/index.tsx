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
    <div className="min-h-screen flex flex-col">
      <div className="w-full">
        <IconHeader />
      </div>
      
      <div className="flex-grow flex flex-col items-center px-4 sm:px-6 md:px-8">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto mt-6 sm:mt-8 md:mt-10 mb-10 sm:mb-12 md:mb-16">
          <BannerHeader />
        </div>
        
        <div className="w-full max-w-md mx-auto">
          {(litAuthMethod.isLoading || litAccount.isLoading || sessionSigs.isLoading) && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 sm:p-5 md:p-6 mb-8 sm:mb-10 md:mb-12 animate-pulse">
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm sm:text-base md:text-lg text-blue-800">
                  {litAuthMethod.isLoading && "Authenticating..."}
                  {litAccount.isLoading && "Loading accounts..."}
                  {sessionSigs.isLoading && "Initializing session..."}
                </span>
              </div>
            </div>
          )}
          
          <div className="w-full">
            <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 md:p-8 border border-gray-100">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-800 mb-6 sm:mb-8">
                Sign In
              </h2>
              <p className="text-sm sm:text-base text-gray-600 text-center mb-8">
                Choose your preferred login method to continue
              </p>
              <AuthMethods />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
