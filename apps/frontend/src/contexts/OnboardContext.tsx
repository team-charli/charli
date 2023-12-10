import { useState, createContext, useContext, useEffect } from 'react'
import { useContextNullCheck } from '../hooks/utils/useContextNullCheck'
import { AuthContext } from './AuthContext'
import { OnboardContextObj, OnboardStateProviderProps } from '../types/types'
import { useHasBalance } from '../hooks/useHasBalance';
import { useIsOnboarded } from '../hooks/useIsOnboarded'
import { useOnboardMode } from '../hooks/useOnboardMode';

export const OnboardContext = createContext<OnboardContextObj | null>(null);
export const useOnboardContext = () => useContext(OnboardContext);

const OnboardStateProvider = ({children}: OnboardStateProviderProps) => {
  const {contextCurrentAccount} = useContextNullCheck(AuthContext)

  const {isOnboarded, setIsOnboarded} = useIsOnboarded({contextCurrentAccount});
  const {onboardMode, setOnboardMode} = useOnboardMode();

  const hasBalance = useHasBalance();
  const [nativeLang, setNativeLang] = useState('');

  const [name, setName] = useState("");
  const [teachingLangs, setTeachingLangs] = useState([] as string[])
  const [learningLangs, setLearningLangs] = useState([] as string[])
  const [walletAddress, setWalletAddress] = useState("")

  /*Debug Hook*/
  useEffect(() => {
    console.log('onboardMode:', onboardMode)
  }, [onboardMode])


  const contextObj: OnboardContextObj = {
    hasBalance,
    isOnboarded,
    setIsOnboarded,
    nativeLang,
    setNativeLang,
    setOnboardMode,
    onboardMode,
    walletAddress,
    setWalletAddress,
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
