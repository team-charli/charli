import google from '../../assets/google.png'
import { AuthMethodsProps } from "../../types/types";

const AuthMethods = ({
  handleGoogleLogin,
}: AuthMethodsProps) => {
  return (
    <>
<button className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-white font-bold py-2 px-4 rounded shadow-xl border border-slate-300  transform hover:scale-105 transition duration-300 ease-in-out focus:outline-none" onClick={handleGoogleLogin}>
        <img src={google} className="w-20" />
      </button>
    </>
  );
};

export default AuthMethods;

