import { IRelayPKP, SessionSigs  } from '@lit-protocol/types';
import { Dispatch, SetStateAction, ReactNode } from 'react'
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

export interface StateContextObj {

  hasBalance: boolean;

  isOnboarded: boolean | null;

  nativeLang: string;
  setNativeLang: Function;

  setTeachingLangs: Dispatch<SetStateAction<string[]>>;
  teachingLangs: string[];

  learningLangs?: string[] | undefined;
  setLearningLangs: Dispatch<SetStateAction<string[]>>;

  onboardMode: "Learn" | "Teach" | null;
  setOnboardMode: Dispatch<SetStateAction<"Learn" |"Teach"| null>>;

  name: string;
  setName: Dispatch<SetStateAction<string>>;

  walletAddress: string;
  setWalletAddress:Dispatch<SetStateAction<string>>;
}

export interface AuthContextObj {
  contextCurrentAccount: IRelayPKP | null;
  contextSetCurrentAccount: Dispatch<SetStateAction<IRelayPKP | null>>;
  contextSessionSigs: SessionSigs | null;
  contextSetSessionSigs: Dispatch<SetStateAction<SessionSigs | null>>;
  isAuthenticated: boolean | null;
}

export interface UIContextObj {
  firedLogin: boolean;
  setFiredLogin: Dispatch<SetStateAction<true | false>>;
}

export interface StateProviderProps  {
  children: ReactNode;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export interface UseIsOnboardedParam {
  contextCurrentAccount: IRelayPKP | null;
}

export interface ButtonLinkPropTypes {
  path: string;
  children: ReactNode;
  onButtonClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export interface LoginViewProps {
  parentIsRoute: boolean;
}

export interface UIProviderProps  {
  children: ReactNode;
}
