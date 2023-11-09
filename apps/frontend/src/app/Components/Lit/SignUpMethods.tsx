import AuthMethods from './AuthMethods';

interface SignUpProps {
  handleGoogleLogin: () => Promise<void>;
  goToLogin: any;
  error?: Error;
}

export default function SignUpMethods({
  handleGoogleLogin,
  goToLogin,
  error,
}: SignUpProps) {

  return (
    <div className="container">
      <div className="wrapper">
        {error && (
          <div className="alert alert--error">
            <p>{error.message}</p>
          </div>
        )}
        (
          <>
            <h1>Get started</h1>
            <p>
              Create a wallet that is secured by accounts you already have. With
              Lit-powered MPC wallets, you won't have to worry about seed
              phrases or browser extensions.
            </p>
            <AuthMethods
              handleGoogleLogin={handleGoogleLogin}
            />
            <div className="buttons-container">
              <button
                type="button"
                className="btn btn--link"
                onClick={goToLogin}
              >
                Have an account? Log in
              </button>
            </div>
          </>
        )
      </div>
    </div>
  );
}

