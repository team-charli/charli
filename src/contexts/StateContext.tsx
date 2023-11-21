import {createContext, Dispatch, SetStateAction  } from 'react'

export interface OnboardData {
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
  keys: {pkpKey: string[], setPkpKey: Function, sessionKey: object, setSessionKey: Function, },
  onBoard: {
    onboardMode: "Learn" | "Teach" | null;
    setOnboardMode: Dispatch<SetStateAction<string | null>>
    hasOnboarded: boolean,
    setOnboardData: Function ,
    onboardData: OnboardData | null,
    setHasOnboarded: Function
  }
}

export const StateContext = createContext<ContextObj | null>(null);

