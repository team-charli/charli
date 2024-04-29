import google from '../../assets/google.png'
import android_logo from '../../assets/android_logo.png'
import discord from '../../assets/discord.png'
import { AuthMethodsProps } from "../../types/types";

const AuthMethods = ({
  handleGoogleLogin,
  handleDiscordLogin,
}: AuthMethodsProps) => {
  return (
    <>
      <button className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-white font-bold py-2 px-4 rounded shadow-xl border border-slate-300 transform hover:scale-105 transition duration-300 ease-in-out focus:outline-none" onClick={() => { void handleGoogleLogin(); }}>
        <img src={google.src} className="w-20" />
      </button>
      <button className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-white font-bold py-2 px-4 rounded shadow-xl border border-slate-300 transform hover:scale-105 transition duration-300 ease-in-out focus:outline-none" onClick={() => { void handleGoogleLogin(); }}>
        <img src={android_logo.src} className="w-20" />
      </button>
      <button className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-white font-bold py-2 px-4 rounded shadow-xl border border-slate-300 transform hover:scale-105 transition duration-300 ease-in-out focus:outline-none" onClick={() => { void handleDiscordLogin(); }}>
        <img src={discord.src} className="w-20" />
      </button>
    </>
  );
};

export default AuthMethods;
