import {iso6393} from 'iso-639-3';
import Routes from './Routes/Routes';
import {useState} from 'react';
import NativeLanguage from './Components/NativeLanguage';
import { useHasBalance } from './hooks/useCheckHasBalance';
import { useKeys }  from './hooks/useKeys';
import { useOnboardData } from './hooks/useOnboardData';
import { useTeachingLanguages } from './hooks/useTeachingLanguages';
import { ContextObj, StateContext } from './contexts/StateContext'

export function App() {
  console.log("is loading")
  const [nativeLang, setNativeLang] = useState('eng');
  const hasBalance = useHasBalance();
  const keys = useKeys();
  const onBoard = useOnboardData()
  const [teachingLangs, setTeachingLangs] = useTeachingLanguages();

  const contextObj: ContextObj = {
    nativeLang,
    setNativeLang,
    hasBalance,
    setTeachingLangs,
    teachingLangs,
    keys,
    onBoard
  };

  return (
      <StateContext.Provider value={contextObj}>
      <NativeLanguage  />
      <Routes />
    </StateContext.Provider >
  );
}

export default App;
