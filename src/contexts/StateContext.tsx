import { useState, createContext, useContext } from 'react'
import { useHasBalance } from '../hooks/stateContext/useHasBalance';
import { useOnboardData } from '../hooks/stateContext/useOnboardData';
import { useTeachingLanguages } from '../hooks/useTeachingLanguages';
import { ContextObj, StateProviderProps } from '../types/types'

export const StateContext = createContext<ContextObj | null>(null);

export const useStateContext = () => useContext(StateContext);

const StateProvider = ({children}: StateProviderProps) => {
  const [nativeLang, setNativeLang] = useState('');
  const hasBalance = useHasBalance();
  const onBoard = useOnboardData()
  const [teachingLangs, setTeachingLangs] = useTeachingLanguages();

  const contextObj: ContextObj = {
    nativeLang,
    setNativeLang,
    hasBalance,
    setTeachingLangs,
    teachingLangs,
    onBoard,
  };

  return (
    <StateContext.Provider value={contextObj}>
      {children}
    </StateContext.Provider>
  )
}

export default StateProvider
