import google from '../../assets/google.png'
import android_logo from '../../assets/android_logo.png'
import discord from '../../assets/discord.png'
import { signInWithGoogle, signInWithDiscord } from '@/utils/lit';
import { renderLoginButtonsAtom } from '@/atoms/atoms';
import { signInInitiatedAtom } from '@/atoms/LitAuth/litAuthMethodAtomQuery';
import { useAtom } from 'jotai';

const AuthMethods = () => {
  const [_, setSignInInitiated] = useAtom(signInInitiatedAtom);
  const [__,setRenderLoginButtons] = useAtom(renderLoginButtonsAtom);

  const handleGoogleLogin = async () => {
    setSignInInitiated(true);
    await signInWithGoogle(process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!);
    setRenderLoginButtons(false);
  };

  const handleDiscordLogin = async () => {
    setSignInInitiated(true);
    await signInWithDiscord(process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI!);
    setRenderLoginButtons(false);
  };

  return (
    <>
      <button onClick={handleGoogleLogin}>
        <img src={google.src} className="w-20" />
      </button>
      <button onClick={handleGoogleLogin}>
        <img src={android_logo.src} className="w-20" />
      </button>
      <button onClick={handleDiscordLogin}>
        <img src={discord.src} className="w-20" />
      </button>
    </>
  );
};

export default AuthMethods;
