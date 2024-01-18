import { useState, createContext, useContext } from 'react'
import { OnboardContextObj, OnboardStateProviderProps } from '../types/types'
import { useHasBalance } from '../hooks/useHasBalance';
import { useIsOnboarded } from '../hooks/useIsOnboarded'
import { useOnboardMode } from '../hooks/useOnboardMode';
import useLocalStorage from '@rehooks/local-storage';

const defaultOnboardContext: OnboardContextObj = {
  hasBalance: null, // boolean | null
  isOnboarded: null, // boolean | null
  setIsOnboarded: () => {}, // LocalStorageSetter<boolean>
  nativeLang: '', // string
  setNativeLang: () => {}, // Function
  teachingLangs: [], // string[]
  setTeachingLangs: () => {}, // Dispatch<SetStateAction<string[]>>
  learningLangs: [], // string[]
  setLearningLangs: () => {}, // Dispatch<SetStateAction<string[]>>
  onboardMode: null, // "Learn" | "Teach" | null
  setOnboardMode: () => {}, // Dispatch<SetStateAction<"Learn" | "Teach" | null>>
  name: '', // string
  setName: () => {}, // Dispatch<SetStateAction<string>>
};
export const OnboardContext = createContext<OnboardContextObj>(defaultOnboardContext);
export const useOnboardContext = () => useContext(OnboardContext);

const OnboardStateProvider = ({children}: OnboardStateProviderProps) => {
  const {onboardMode, setOnboardMode} = useOnboardMode();
  const [isOnboarded, setIsOnboarded] = useLocalStorage<boolean>('isOnboarded');
  const [hasBalance, setHasBalance] = useLocalStorage<boolean | null>('hasBalance', null)

  useIsOnboarded(isOnboarded, setIsOnboarded);

  useHasBalance(hasBalance, setHasBalance);
  const [nativeLang, setNativeLang] = useState('');

  const [name, setName] = useState("");
  const [teachingLangs, setTeachingLangs] = useState([] as string[]);
  const [learningLangs, setLearningLangs] = useState([] as string[]);

  const contextObj: OnboardContextObj = {
    hasBalance,
    isOnboarded,
    setIsOnboarded,
    nativeLang,
    setNativeLang,
    setOnboardMode,
    onboardMode,
    setName,
    name,
    teachingLangs,
    setTeachingLangs,
    learningLangs,
    setLearningLangs,
  };

  return (
    <OnboardContext.Provider value={contextObj}>
      {children}
    </OnboardContext.Provider>
  )
}

export default OnboardStateProvider
