import 'dotenv/config'
import {iso6393} from 'iso-639-3'
import Routes from './Routes/Routes'
import {useState} from 'react'
import NativeLanguage from './Components/NativeLanguage'
import { useHasBalance } from './hooks/useCheckHasBalance'
import { useIsTeacher } from './hooks/useCheckIsTeacher';
import { useKeys }  from './hooks/useKeys';
import { StyledApp } from "./style/StyledApp";
import { useOnboardData } from './hooks/useOnboardData'
import { ContextObj, StateContext } from './contexts/StateContext'

export function App() {
  const [nativeLang, setNativeLang] = useState('eng');
  const hasBalance = useHasBalance();
  const isTeacher = useIsTeacher();
  const keys = useKeys();
  const onBoard = useOnboardData()

  const contextObj: ContextObj = {
    nativeLang,
    hasBalance,
    isTeacher,
    keys,
    onBoard
  };

  return (
    <StyledApp>
      <StateContext.Provider value={contextObj}>
      <NativeLanguage setNativeLang={setNativeLang} />
      <Routes />
    </StateContext.Provider >
    </StyledApp>
  );
}

export default App;
