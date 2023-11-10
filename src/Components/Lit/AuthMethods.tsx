import google from '../../assets/google.png'
import { AuthMethodsProps } from "../../types/types";

const AuthMethods = ({
  handleGoogleLogin,
}: AuthMethodsProps) => {
  return (
    <>
      <div className="buttons-container">
        <div className="social-container">
          <button
            type="button"
            className="btn btn--outline"
            onClick={handleGoogleLogin}
          >
            <div className="btn__icon">
            <img src={google} alt="Google logo" style={{ width: '30px', height: '30px' }} />
            </div>
            <span className="btn__label">Google</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default AuthMethods;

