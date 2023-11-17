import { useState } from 'react';
import { AuthView, LoginProps } from "../../types/types";
import AuthMethods from './AuthMethods';

export default function LoginMethods({
  handleGoogleLogin,
  signUp,
  error,
}: LoginProps) {
  const [view] = useState<AuthView>('default');
//TODO: Login/SignUp Same Component; detect account
  return (
        <>
        {error && (
            <p>{error.message}</p>
        )}
        {view === 'default' && (
          <>
            <AuthMethods
              handleGoogleLogin={handleGoogleLogin}
            />
          </>
        )}
       </>
  );
}


