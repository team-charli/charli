import { SupabaseClient } from '@supabase/supabase-js';
import { IRelayPKP, SessionSigs, AuthMethod  } from '@lit-protocol/types';
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

  teachingLangs: string[];
  setTeachingLangs: Dispatch<SetStateAction<string[]>>;

  learningLangs: string[];
  setLearningLangs: Dispatch<SetStateAction<string[]>>;

  onboardMode: "Learn" | "Teach" | null;
  setOnboardMode: Dispatch<SetStateAction<"Learn" |"Teach"| null>>;

  name: string;
  setName: Dispatch<SetStateAction<string>>;
  checkIsOnboarded: boolean;
  setCheckIsOnboarded:Dispatch<SetStateAction<boolean>>;
}

export interface AuthContextObj {
  authMethod: AuthMethod | undefined;
  // setAuthMethod: Dispatch<SetStateAction<AuthMethod | undefined>>;
  currentAccount: IRelayPKP | undefined;
  // setCurrentAccount: Dispatch<SetStateAction<IRelayPKP | null>>;
  sessionSigs: SessionSigs | undefined;
  // setSessionSigs: Dispatch<SetStateAction<SessionSigs | undefined>>;
  jwt: string | null;
  updateJwt: Function;
  supabaseClient: SupabaseClient | null;
  isAuthenticated: boolean | null;
  authLoading: boolean;
  accountsLoading: boolean;
  sessionLoading: boolean;
  authError: Error | undefined;
  accountsError: Error | undefined;
  sessionError: Error | undefined;
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
  // currentAccount: IRelayPKP | null;
  checkIsOnboarded: boolean;
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

export type CountryInfo = {
  country_code: string;
  country_name: string;
  lang_iso3: string;
};

export type LanguageEntry = {
  [key: string]: CountryInfo[];
};

export type ifaceLanguages = LanguageEntry[];

export interface LanguageInfo {
  language: string;
  langA3: string;
  primaryFlag: string;
  secondaryFlag: string;
  omitSecondaryFlag: boolean;
}

interface RegionToCountryMap  {
  [region: string]: string | 'geolocation';
}

export interface FlagRules {
  [languageCode: string]: RegionToCountryMap;
}

export interface FlagCodes {
  [language: string]: {
    primary: string;
    secondary: string;
  };
}

export interface EmojiFlags {
  [language: string]: {
    primary: string;
    secondary: string;
  };
}

export interface SubRegionInfo {
  subRegion: string;
  intermediateRegion: string;
}

export interface CountryDataset {
  [key: string]: {
    name: string;
    alpha2: string;
    alpha3: string;
    region: string;
    subRegion: string;
    intermediateRegion: string;
    flag: string;
  };
}

export interface LanguageDataset {
  [language: string]: {
    countries: string[];
    flags: string[];
  };
}

export interface PopFlags {
   [language: string] : {
    country: string;
    population?: number;
    flag: string;
  }
}

export interface LangIso2NameMap {
  [key: string]: string;
}

export type LanguageButton = {
  language: string;
  primaryFlag: string;
  secondaryFlag?: string; // Add this line if secondaryFlag is optional
  omitSecondaryFlag?: boolean;
};

export type SearchLangComboBoxProps = {

  setCombinedLanguages: React.Dispatch<React.SetStateAction<LanguageButton[]>>;
  combinedLanguages: LanguageButton[];
  control: any; // Assuming control is from react-hook-form
  setValue: any;
  getValues: any;
};

export type LanguageToggleButtonsProps = {
  control: any;
  setValue: any;
  combinedLanguages: LanguageButton[];
  additionalLanguages?: LanguageButton[];
};

export interface OnboardFormData {
  name: string;
  [key: string]: boolean | string;
}

