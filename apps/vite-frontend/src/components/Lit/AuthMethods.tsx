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
    <div className="flex flex-col items-center w-full px-3 gap-y-4 sm:flex-row sm:flex-wrap sm:justify-center sm:px-4 sm:gap-x-4 sm:gap-y-4 md:gap-x-6 md:px-6 lg:gap-x-8 lg:px-0">
      <div className="w-full text-center mb-2 sm:mb-3 md:mb-4 lg:mb-6">
        <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-800">
          Sign in with
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-4 md:gap-6 lg:gap-8 w-full max-w-xs sm:max-w-2xl">
        {[{ src: google, onClick: handleGoogleLogin, name: "Google" },
          { src: android_logo, onClick: handleGoogleLogin, name: "Android" },
          { src: discord, onClick: handleDiscordLogin, name: "Discord" }
        ].map(({ src, onClick, name }, idx) => (
          <button
            key={idx}
            onClick={() => { void onClick(); }}
            className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-gray-700 font-medium rounded-xl shadow-md border border-slate-200 transform hover:scale-102 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-300 py-2 px-3 sm:py-3 sm:px-4 md:py-4 md:px-5 lg:py-5 lg:px-6 flex flex-col items-center"
          >
            <img src={src} alt={`${name} login`} className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 object-contain mb-2" />
            <span className="text-xs sm:text-sm md:text-base">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AuthMethods;
