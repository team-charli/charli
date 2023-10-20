import 'dotenv/config'
import {iso6393} from 'iso-639-3'
import styled from '@emotion/styled';
import Routes from './Routes/Routes'
import {createContext, useState} from 'react'
import NativeLanguage from './Components/NativeLanguage'
import { useHasBalance } from './hooks/useCheckHasBalance'
import { useIsTeacher } from './hooks/useCheckIsTeacher';
import { ContextObj, StateContext } from './contexts/StateContext'

const StyledApp = styled.div`
  // Your style here
`;


export function App() {
  const hasBalance = useHasBalance();
  const [nativeLang, setNativeLang] = useState('eng');
  const isTeacher = useIsTeacher();

  const contextObj: ContextObj = {
    nativeLang,
    hasBalance,
    isTeacher
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
