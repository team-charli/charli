import { useState, createContext, useContext, useEffect } from 'react'
import { useContextNullCheck } from '../hooks/utils/useContextNullCheck'
import { AuthContext } from './AuthContext'
import { StateContextObj, StateProviderProps } from '../types/types'
import { useHasBalance } from '../hooks/useHasBalance';
import { useIsOnboarded } from '../hooks/useIsOnboarded'
import { useOnboardMode } from '../hooks/useOnboardMode';
export const StateContext = createContext<StateContextObj | null>(null);
export const useStateContext = () => useContext(StateContext);

const StateProvider = ({children}: StateProviderProps) => {
  const {contextCurrentAccount} = useContextNullCheck(AuthContext)

  const isOnboarded = useIsOnboarded({contextCurrentAccount});
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


  const contextObj: StateContextObj = {
    hasBalance,
    isOnboarded,
    nativeLang,
    setNativeLang,
    teachingLangs,
    setTeachingLangs,
    learningLangs,
    setLearningLangs,
    setOnboardMode,
    onboardMode,
    name,
    setName,
    walletAddress,
    setWalletAddress,
  };

  return (
    <StateContext.Provider value={contextObj}>
      {children}
    </StateContext.Provider>
  )
}

export default StateProvider
