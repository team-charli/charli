import {createContext} from 'react'

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
  isTeacher: boolean;
  keys: {pkpKey: string[], setPkpKey: Function, sessionKey: object, setSessionKey?: Function, },
  onBoard: {
    hasOnboarded: boolean,
    setOnboardData: Function ,
    onboardData: OnboardData | null,
    setHasOnboarded: Function
  }
}

export const StateContext = createContext<ContextObj | null>(null);

