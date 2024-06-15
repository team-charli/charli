import { SupabaseClient } from '@supabase/supabase-js';
import { AuthMethod, AuthSig, IRelayPKP, SessionSigs  } from '@lit-protocol/types';
import { Dispatch, SetStateAction, ReactNode } from 'react'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';

export interface AuthMethodsProps {
  handleGoogleLogin: () => Promise<void>;
  handleDiscordLogin: () => Promise<void>;
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

export type NameInputFieldProps = {
  name: string;
  onNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
export interface OnboardFormProps {
  onboardMode: "Teach"  | "Learn" | null;
}
export type FormValues = {
  name: string;
  [key: string]: string | boolean;  // Allow additional keys for languages
};

export interface PkpWalletContextObj {
  pkpWallet: PKPEthersWallet | null;
}
export interface PkpWalletProviderProps {
  children: ReactNode;
}

export interface AuthOnboardContextObj {
  authMethod: AuthMethod | null;
  authLoading: boolean;
  accountsLoading: boolean;
  sessionLoading: boolean;
  authError: Error | undefined;
  accountsError: Error | undefined;
  sessionError: Error | undefined;
  isLitLoggedIn: boolean | null;
  onboardMode: "Learn" | "Teach" | null;
  setOnboardMode: Dispatch<SetStateAction<"Learn" |"Teach"| null>>;
  isOnboarded: boolean | null;
  setIsOnboarded:LocalStorageSetter<boolean>;
  hasBalance: boolean | null;
  nativeLang: string;
  setNativeLang: Dispatch<SetStateAction<string>>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  teachingLangs: string[];
  setTeachingLangs: Dispatch<SetStateAction<string[]>>;

  learningLangs: string[];
  setLearningLangs: Dispatch<SetStateAction<string[]>>;

  setRenderLoginButtons: (newValue: LocalStorageSetStateValue<boolean> | null) => void;
  renderLoginButtons: boolean;

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
export interface SignSessionDurationParams {
  sessionDuration: number;
  sessionSigs: SessionSigs | null,
  currentAccount: IRelayPKP | null
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

export interface ConfirmedLearningRequestProps {
  notification: NotificationIface;
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

export interface LanguageButton {
  id: number;
  language: string;
  languageCode: string;
  flag: string;
  isSelected?: boolean;
}

type OnToggleLanguage = (languageButton: LanguageButton) => void;

export type LanguageToggleButtons = {
  selectedLanguages: LanguageButton[];
  onToggleLanguage:  OnToggleLanguage;
}

type OnSelectLanguage = (language: LanguageButton) => void;

export type SearchLangComboBoxProps = {
  setLanguageButtons: React.Dispatch<React.SetStateAction<LanguageButton[]>>;
  languageButtons: LanguageButton[];
  onSelectLanguage: OnSelectLanguage
};

export type LanguageToggleButtonsProps = {
  languageButtons: LanguageButton[];
  onToggleLanguage: (languageButton: LanguageButton) => void;
};

export interface OnboardFormData {
  name: string;
  [key: string]: boolean | string;
}

type LocalStorageSetStateValue<TValue> = TValue | ((prevState: TValue | null) => TValue);
export type LocalStorageSetter<TValue> = (newValue: LocalStorageSetStateValue<TValue> | null) => void;

export interface SupabaseContextValue {
  supabaseLoading: boolean;
  supabaseClient: SupabaseClient | null;
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
  controller_address: string;
  controller_claim_user_id: string;
  controller_public_key: string;
  controller_claim_keyid: string;
  requested_session_duration: number;
  hashed_learner_address: string;
  hashed_teacher_address: string;
  learner_joined_timestamp: string;
  learner_joined_signature: string;
  teacher_joined_timestamp: string;
  teacher_joined_signature: string;
  learner_left_timestamp: string;
  learner_left_signature: string;
  teacher_left_timestamp: string;
  teacher_left_signature: string;
  learner_joined_timestamp_worker_sig: string;
  learner_left_timestamp_worker_sig: string;
  teacher_joined_timestamp_worker_sig: string;
  teacher_left_timestamp_worker_sig: string;
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

export type ExtendedSession = Session /*&& SessionCategoryFlags */& PreSessionStateFlags & PostSessionStateFlags ;

export type NotificationContextType = {
  notificationsContextValue: ExtendedSession[];
  showIndicator: boolean;
  setShowIndicator: Dispatch<SetStateAction<boolean>>;
};

export interface NotificationIface {
  type: 'learn' | 'teach';
  subType: string;
  session_id: number;
  request_origin_type?: 'learner' | 'teacher';
  teacherName: string;
  learnerName: string;
  teacher_id: number;
  learner_id: number;
  request_time_date: string;
  confirmed_time_date?: string | null;
  counter_time_date?: string;
  session_rejected_reason?: string;
  roomId?: string;
  teaching_lang: string;
  controller_address?: string;  // Made optional
  controller_claim_user_id?: string;
  controller_public_key?: string;
  controller_claim_keyid?: string;
  requested_session_duration?: number;
  hashed_learner_address?: string;
  hashed_teacher_address?: string;
}

export interface SessionIface {
  sessionId: number;
}

// export const defaultSessionParams: SessionParamsResult = {
//   controllerPublicKey: null,
//   controllerAddress: null,
//   learnerAddress: null,
//   keyId: null,
//   controllerAuthSig: null ,
// };

export interface MatchParams {
  id: string;
}

export interface SessionParamsResult {
    controllerPublicKey: string | null;
    controllerAddress: string | null;
    learnerAddress: string | null;
    requestedSessionDuration: string | null;
    requestedSessionDurationLearnerSig: string | null;
    keyId: string | null;
    hashedLearnerAddress: string | null;
}

export interface TimestampResponse {
  timestamp: string;
  signature: string;
}

export interface SessionDurationData {
  sessionId: string;
  sessionDuration: number;
  learnerSignature?: string;
  teacherSignature?: string;
}

export interface IPFSResponse {
  cid: string;
  data: SessionDurationData;
}

export interface User {
  role: "teacher" | "learner" | null;
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  joinedAtSig: string | null;
  leftAtSig: string | null;
  faultTime?: number;
  faultTimeSig?: string;
  duration: number | null;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
}

export interface SessionData {
  teacher: User | null;
  learner: User | null;
}

export interface FaultData {
  faultType: 'learnerFault_didnt_join' | 'teacherFault_didnt_join' | 'learnerFault_connection_timeout' | 'teacherFault_connection_timeout' | undefined;
  user: User | undefined;
  faultTime: number;
  faultTimeSig: string;
}


export interface SessionIPFSData extends SessionData {
  signedClientTimestamp: string;
  clientTimestamp: number;
  confirmedDuration?: number;
  confirmedDuration_teacherSignature?: string;
  confirmedDuration_learnerSignature?: string;
  fault?: FaultData;
}

export interface Message {
  type: 'init' | 'websocket' | 'message';
  data: any;
}

export interface UseSessionManagerOptions {
  clientSideRoomId: string | undefined;
  hashedTeacherAddress: string | undefined;
  hashedLearnerAddress: string | undefined;
  userAddress: string | undefined;
  currentAccount: IRelayPKP | null;
  sessionSigs: SessionSigs | null;
}

