import { useState } from 'react';
import { AuthView, LoginProps } from "../../types/types";
import AuthMethods from './AuthMethods';

export default function LoginMethods({
  handleGoogleLogin,
  signUp,
  error,
}: LoginProps) {
  const [view] = useState<AuthView>('default');

  return (
    <div className="container">
      <div className="wrapper">
        {error && (
          <div className="alert alert--error">
            <p>{error.message}</p>
          </div>
        )}
        {view === 'default' && (
          <>
            <h1>Welcome back</h1>
            <p>Access your Lit wallet.</p>
            <AuthMethods
              handleGoogleLogin={handleGoogleLogin}
            />
            <div className="buttons-container">
              <button type="button" className="btn btn--link" onClick={signUp}>
                Need an account? Sign up
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

