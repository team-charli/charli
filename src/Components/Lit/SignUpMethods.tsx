import AuthMethods from './AuthMethods';
import BannerHeader from '../Headers/BannerHeader'

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
    <div >
      <div>
        {error && (
          <div className="alert alert--error" style={{ textAlign: 'center' }}>
            <p>{error.message}</p>
          </div>
        )}
          <BannerHeader />

        <div className="justify-center ">
          <div>
            <button type="button" onClick={goToLogin} >
              Log in
            </button>
          </div>
          <div>
            <p>Create an Account</p>
            <AuthMethods handleGoogleLogin={handleGoogleLogin} />
          </div>
        </div>
      </div>
  </div>
);
}

