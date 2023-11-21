import { RouteProps } from 'react-router-dom';
import { IRelayPKP, /* SessionSigs  */} from '@lit-protocol/types';

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

