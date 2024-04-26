import { useState, createContext, useContext, ReactNode} from 'react'
import {UIContextObj, UIProviderProps} from '../types/types'


export const UIContext = createContext<UIContextObj | null>(null);
export const useUIContext = () => useContext(UIContext);

const UIProvider = ({children}: UIProviderProps) => {
  const [firedLogin, setFiredLogin] = useState(false)

  const contextObj = {
    firedLogin,
    setFiredLogin
  }

  return (
    <UIContext.Provider value={contextObj}>
      {children}
    </UIContext.Provider>
  )
}

export default UIProvider
