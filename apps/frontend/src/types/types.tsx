 {SupabaseClient } from '@supabase/supabase-js';import { IRelayPKP, SessionSigs  } from '@lit-protocol/types';
import { SupabaseClient } from '@supabase/supabase-js';
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
  key: any;
  control: any;
  setValue: any;
};


export type CombinedFormProps = {
  onboardMode: "Learn" | "Teach" | null;
}

export type FormValues = {
  name: string;
  [key: string]: string | boolean;  // Allow additional keys for languages
};

export interface OnboardContextObj {

  hasBalance: boolean;

  isOnboarded: boolean | null;
  setIsOnboarded: Dispatch<SetStateAction<boolean| null>>;
  nativeLang: string;
  setNativeLang: Function;

  // setTeachingLangs: Dispatch<SetStateAction<string[]>>;
  // teachingLangs: string[];

  // learningLangs?: string[] | undefined;
  // setLearningLangs: Dispatch<SetStateAction<string[]>>;

  onboardMode: "Learn" | "Teach" | null;
  setOnboardMode: Dispatch<SetStateAction<"Learn" |"Teach"| null>>;

  // name: string;
  // setName: Dispatch<SetStateAction<string>>;

  walletAddress: string;
  setWalletAddress:Dispatch<SetStateAction<string>>;
}

export interface AuthContextObj {
  contextCurrentAccount: IRelayPKP | null;
  contextSetCurrentAccount: Dispatch<SetStateAction<IRelayPKP | null>>;
  contextSessionSigs: SessionSigs | null;
  contextSetSessionSigs: Dispatch<SetStateAction<SessionSigs | null>>;
  isAuthenticated: boolean | null;
  jwt: string | null;
  updateJwt: Function;
  supabaseClient: SupabaseClient | null;
 }


export interface UIContextObj {
  firedLogin: boolean;
  setFiredLogin: Dispatch<SetStateAction<true | false>>;
}

export interface OnboardStateProviderProps  {
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

export type LocationState = {
  countryCode: string;
  countryName: string;
};

export type GeolocationApiResponse = {
  status: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
};

export interface Country {
  'name': string;
  'alpha-2': string;
  'alpha-3': string;
  'country-code': string;
  'iso_3166-2': string;
  'region': string;
  'sub-region': string;
  'intermediate-region': string;
  'region-code': string;
  'sub-region-code': string;
  'intermediate-region-code': string;
}


export interface ifaceLanguageCountryMap  {
country_code: string;
country_name: string;
lang_iso3: string;
}
