import { SupabaseClient } from '@supabase/supabase-js';
import { IRelayPKP, SessionSigs  } from '@lit-protocol/types';
import { Dispatch, SetStateAction, ReactNode } from 'react'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';

export interface AuthMethodsProps {
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
}

export interface HydrateAtomsIface {
  children: ReactNode;
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
  languageButtons: LanguageButton[] | undefined;
  onToggleLanguage: (languageButton: LanguageButton) => void;
};

export interface OnboardFormData {
  name: string;
  [key: string]: boolean | string;
}

type LocalStorageSetStateValue<TValue> = TValue | ((prevState: TValue | null) => TValue);
export type LocalStorageSetter<TValue> = (newValue: LocalStorageSetStateValue<TValue> | null) => void;

export interface SupabaseContextValue {
  // supabaseLoading: boolean;
  supabaseClient: SupabaseClient<any, "public", any> | null;
}
export interface SupabaseProviderProps {
  children: ReactNode;
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
  isImminent: boolean;
  isExpired: boolean
};

type PostSessionStateFlags = {
  isExpired: boolean;
}

export type ExtendedSession = Session & PreSessionStateFlags & PostSessionStateFlags ;


export type ReceivedTeachingRequestProps = {
  notification: NotificationIface;
};

export interface ConfirmedLearningRequestProps {
  notification: NotificationIface;
}

export type SessionsContextType = {
  sessionsContextValue: ExtendedSession[];
  showIndicator: boolean;
  setShowIndicator: Dispatch<SetStateAction<boolean>>;
};

export interface NotificationIface {
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
  roomId?: string | undefined;
  teaching_lang: string;
  controller_address?: string;  // Made optional
  controller_public_key?: string;
  requested_session_duration?: number;
  hashed_learner_address?: string;
  hashed_teacher_address?: string;
  isImminent?: boolean;
  isExpired?: boolean;
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
  controllerAddress: string | null;
  requestedSessionDuration: number | null;
  requestedSessionDurationLearnerSig: string | null;
  hashedLearnerAddress: string | null;
  secureSessionId: string | null;
  learnerAddressEncryptHash: string | null;
  learnerAddressCipherText: string | null;
}


export interface TimestampResponse {
  timestamp: string;
  signature: string;
}

export interface SessionDurationData {
  sessionId: string;
  sessionDuration: number;
  timestamp: number
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
  sessionDuration: number | undefined;
  sessionDataLearnerSig: SignatureLike;
  sessionDataTeacherSig: SignatureLike;
  secureSessionId: string | null;
}

export type SupabaseError = {
  message: string;
  // Add other properties if needed
};

export type AuthData = {
  idToken: string;
  accessToken: string;
  provider: string;
}

/**
 * A universal auth object that can accommodate:
 *  - Google sign-in’s separate ID token & access token
 *  - Lit’s requirement to set `accessToken` as the “AuthMethod token”
 *  - A numeric `authMethodType` for Lit
 *  - Additional fields for other providers if needed
 */
export type UnifiedAuth = {
  /** 'googleJwt' | 'discord' or other recognized providers */
  provider: string;

  /** The actual Google ID token (the JWT with 3 parts, used by Supabase signInWithIdToken)
   *  or potentially null if the provider doesn't use an ID token.
   */
  idToken: string | null;

  /** The real Google “access_token” from OAuth if you want it for userinfo calls,
   *  or Discord’s token if you want it. Possibly null if you don’t need it.
   */
  oauthAccessToken: string | null;

  /** The token that Lit wants in `authMethod.accessToken`.
   *  - For Google: Lit expects the *ID token* (the real JWT).
   *  - For Discord: Lit expects the Discord token here, etc.
   */
  litAccessToken: string | null;

  /** A numeric code for Lit (6 = Google, 4 = Discord, etc.) */
  authMethodType: number;
};

export interface Language {
  id: number;
  name: string;
  language_code: string;
  country_code: string | null;
  emoji: string | null;
}

export interface UserItemIface {
  userName: string,
  userID: number,
  lang: string,
  modeView: "Learn" | "Teach"
}

// types.ts
import { AddressLike, BigNumberish, SignatureLike } from 'ethers';
import { UseMutationResult } from '@tanstack/react-query';

export interface SessionControllerData {
  controller_address: AddressLike;
  controller_public_key: string;
  sessionId: BigNumberish;
}

export interface ExecuteApproveFundControllerActionParams {
  spenderAddress: string;
  amount: BigNumberish;
  sig: SignatureLike;
  secureSessionId: string;
  userId: string;
  ipfsCid: string;
}

export interface SubmitLearningRequest {
  dateTime: string;
  teacherID: number;
  userID: number;
  teachingLang: string;
  sessionDuration: number;
  learnerSignedSessionDuration: SignatureLike;
  secureSessionId: string;
  controllerData: ControllerData;
}

export interface LearningRequestState {
  sessionLengthInputValue: string;
  setSessionLengthInputValue: React.Dispatch<React.SetStateAction<string>>;
  toggleDateTimePicker: boolean;
  setToggleDateTimePicker: React.Dispatch<React.SetStateAction<boolean>>;
  renderSubmitConfirmation: boolean;
  setRenderSubmitConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
  dateTime: string;
  setDateTime: React.Dispatch<React.SetStateAction<string>>;
  sessionDuration: number;
  amount: BigNumberish;
}

export interface UseUserItemReturn {
  learningRequestState: LearningRequestState;
  generateControllerData: () => Promise<ControllerData>;
  signSessionDuration: UseMutationResult<SignatureLike, unknown, { duration: number; secureSessionId: string }, unknown>;
  executeApproveFundControllerAction: UseMutationResult<any, unknown, ExecuteApproveFundControllerActionParams, unknown>;
  submitLearningRequest: UseMutationResult<boolean, unknown, SubmitLearningRequest, unknown>;
  signApproveTransaction: any;
}
