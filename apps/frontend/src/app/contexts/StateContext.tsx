import {createContext} from 'react'

export interface ContextObj {
  nativeLang: string;
  hasBalance: boolean;
  isTeacher: boolean;
}

export const StateContext = createContext<ContextObj | null>(null);

