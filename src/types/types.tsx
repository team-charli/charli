import { IRelayPKP, SessionSigs  } from '@lit-protocol/types';
import { Dispatch, SetStateAction } from 'react'
import { RouteProps } from 'react-router-dom';

export interface PrivateRouteProps extends RouteProps {
  component: React.ComponentType<any>;
}
export interface AuthMethodsProps {
  handleGoogleLogin: () => Promise<void>;
  /* handleDiscordLogin: () => Promise<void>; */
  /*setView: React.Dispatch<React.SetStateAction<string>>;*/
}

export interface LoginProps {
  handleGoogleLogin: () => Promise<void>;
  handleDiscordLogin?: () => Promise<void>;
  authWithEthWallet?: any;
  authWithOTP?: any;
  authWithWebAuthn?: any;
  authWithStytch?: any;
  signUp: any;
  error?: Error;
}

export type AuthView = 'default' /*| 'email' | 'phone' | 'wallet' | 'webauthn';*/
export type ToggleButtonProps = {
  label: string;
  name: string;
  control: any;
  setValue: any;
};


export type CombinedFormProps = {
  onboardMode: "Learn" | "Teach" | null;
  languages?: string[];  // Optional languages prop for future use
  currentAccount: IRelayPKP;
}

export type FormValues = {
  name: string;
  [key: string]: string | boolean;  // Allow additional keys for languages
};

interface OnboardData {
  name: string;
  walletAddress: string;
  wantsToLeanLangs?: string[] | undefined;
  wantsToTeachLangs?: string[] | undefined;
}

export interface ContextObj {
  nativeLang: string;
  setNativeLang: Function;
  hasBalance: boolean;
  setTeachingLangs: Dispatch<SetStateAction<string[]>>;
  teachingLangs: string[];
  onBoard: {
    onboardMode: "Learn" | "Teach" | null;
    setOnboardMode: Dispatch<SetStateAction<"Learn" |"Teach"| null>>
    hasOnboarded: boolean,
    setOnboardData: Function ,
    onboardData: OnboardData | null,
    setHasOnboarded: Function
  }
}

export interface StateProviderProps  {
  children: ReactNode;
}

export interface AuthContextObj {
  contextSessionSigs: SessionSigs | null;
  contextSetSessionSigs: Dispatch<SetStateAction<SessionSigs | null>>;
  contextSetCurrentAccount: Dispatch<SetStateAction<IRelayPKP | null>>;
  contextCurrentAccount: IRelayPKP | null;
  isAuthenticated: boolean | null;

}
export interface AuthProviderProps {
  children: ReactNode;
}

