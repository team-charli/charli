import google from '../../assets/google.png'
import android_logo from '../../assets/android_logo.png'
import discord from '../../assets/discord.png'
import { signInWithGoogle, signInWithDiscord } from '@/utils/lit';
import { useAtom } from 'jotai';
import { renderLoginButtonsAtom } from '@/atoms/atoms';

const AuthMethods = () => {
  const [__,setRenderLoginButtons] = useAtom(renderLoginButtonsAtom);

  const handleGoogleLogin = async () => {
    await signInWithGoogle(import.meta.env.VITE_GOOGLE_REDIRECT_URI!);
    setRenderLoginButtons(false);
  };

  const handleDiscordLogin = async () => {
    await signInWithDiscord(import.meta.env.VITE_DISCORD_REDIRECT_URI!);
    setRenderLoginButtons(false);
  };

  return (
    <>
      <button className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-white font-bold py-2 px-4 rounded shadow-xl border border-slate-300 transform hover:scale-105 transition duration-300 ease-in-out focus:outline-none" onClick={() => { void handleGoogleLogin() }}>
        <img src={google} className="w-20" />
      </button>
      <button className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-white font-bold py-2 px-4 rounded shadow-xl border border-slate-300 transform hover:scale-105 transition duration-300 ease-in-out focus:outline-none" onClick={() => { void handleGoogleLogin()}}>
        <img src={android_logo} className="w-20" />
      </button>
      <button className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-white font-bold py-2 px-4 rounded shadow-xl border border-slate-300 transform hover:scale-105 transition duration-300 ease-in-out focus:outline-none" onClick={() => { void handleDiscordLogin(); setRenderLoginButtons(false);}}>
        <img src={discord} className="w-20" />
      </button>
    </>
  );
};

export default AuthMethods;
