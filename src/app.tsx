import Routes from './Routes/Routes';
import {useState} from 'react';
import { useHasBalance } from './hooks/useCheckHasBalance';
import { useKeys }  from './hooks/useKeys';
import { useOnboardData } from './hooks/useOnboardData';
import { useTeachingLanguages } from './hooks/useTeachingLanguages';
import { ContextObj, StateContext } from './contexts/StateContext'

export function App() {
  const [nativeLang, setNativeLang] = useState('');
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
      <Routes />
    </StateContext.Provider >
  );
}

export default App;
