import { SupabaseClient } from '@supabase/supabase-js';
import { AuthMethod, AuthSig, IRelayPKP, SessionSigs  } from '@lit-protocol/types';
import { Dispatch, SetStateAction, ReactNode } from 'react'
import { RouteProps } from 'react-router-dom';
import { createContext } from 'vm';

export interface PrivateRouteProps extends RouteProps {
  component: React.ComponentType<any>;
}
export interface AuthMethodsProps {
  handleGoogleLogin: () => Promise<void>;
  handleDiscordLogin: () => Promise<void>;
  /*setView: React.Dispatch<React.SetStateAction<string>>;*/
}

export interface LoginProps {
  handleGoogleLogin: () => Promise<void>;
  handleDiscordLogin?: () => Promise<void>;
  authWithEthWallet?: any;
  authWithOTP?: any;
  authWithWebAuthn?: any;
  authWithStytch?: any;
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
  hasBalance: boolean | null;

  isOnboarded: boolean | null;
  setIsOnboarded: LocalStorageSetter<boolean>;

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
}

export interface AuthContextObj {
  authMethod: AuthMethod | null;
  authLoading: boolean;
  accountsLoading: boolean;
  sessionLoading: boolean;
  authError: Error | undefined;
  accountsError: Error | undefined;
  sessionError: Error | undefined;
  currentAccount: IRelayPKP | null;
  sessionSigs: SessionSigs | null;
  authSig: AuthSig | null;
  // isLitLoggedIn: boolean;
}


interface Notification {
 unread: boolean;
 text: string;
}

export interface UIContextObj {
  firedLogin: boolean;
  setFiredLogin: Dispatch<SetStateAction<true | false>>;
  notification: Notification;
}

export interface OnboardStateProviderProps  {
  children: ReactNode;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export interface SupabaseProviderProps {
  children: ReactNode;
}

export interface HuddleProviderProps {
  children: ReactNode;
}

export interface NotificationProviderProps {
  children: ReactNode;
}

export interface UseIsOnboardedParam {
  checkIsOnboarded: boolean;
  setCheckIsOnboarded: Dispatch<SetStateAction<true | false>>;
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

type LocalStorageSetStateValue<TValue> = TValue | ((prevState: TValue | null) => TValue);
export type LocalStorageSetter<TValue> = (newValue: LocalStorageSetStateValue<TValue> | null) => void;

export interface SupabaseContextValue {
  client: SupabaseClient | null;
  supabaseLoading: boolean;
}
export interface NonceData {
  nonce: string;
}

export interface NetworkContextType {
  isOnline: boolean;
  preventRequests: boolean;
}

// Define an interface for the NetworkProvider's props to address the second error
export interface NetworkProviderProps {
  children: React.ReactNode; // This type is provided by React for children prop
}

export interface UseGetLanguagesResult {
  wantsToTeachLangs: string[]; // Assuming this is the correct type for your data
  wantsToLearnLangs: string[]; // Assuming this is the correct type for your data
  isLoading: boolean; // Represents if either teachingLangs or learningLangs is loading
  error: Error | null; // Represents the latest error occurred, if any
}

// Base session data
 export type Session = {
  request_origin: number;
  request_origin_type: 'learner' | 'teacher';
  learner_id: number ;
  teacher_id: number ;
  learnerName: string ;
  teacherName: string
  request_time_date: string;
  counter_time_date: string;
  confirmed_time_date: string;
  session_rejected_reason: string;
  huddle_room_id: string;
  session_id: number;
  teaching_lang: string;
};

type PreSessionStateFlags = {
  isProposed: boolean;
  isAmended: boolean;
  isAccepted: boolean;
  isRejected: boolean;
};

type PostSessionStateFlags = {
  // isStarted: boolean;
  // isEnded: boolean;
  isExpired: boolean;
}

// type SessionCategoryFlags = {
//   isTeacherToLearner: boolean;
//   isLearnerToTeacher: boolean;
// };

export type ExtendedSession = Session /*&& SessionCategoryFlags */& PreSessionStateFlags & PostSessionStateFlags ;

export type NotificationContextType = {
  notificationsContextValue: ExtendedSession[];
  showIndicator: boolean;
  setShowIndicator: Dispatch<SetStateAction<boolean>>;
};

export interface BaseNotification {
  type: 'learn' | 'teach';
  subType: string;
  session_id: number;
  teacherName: string;
  learnerName: string;
  teacher_id: number;
  learner_id: number;
  request_time_date: string;
  confirmed_time_date?: string;
  counter_time_date?: string;
  session_rejected_reason?: string;
  roomId?: string;
  teaching_lang: string;
}

