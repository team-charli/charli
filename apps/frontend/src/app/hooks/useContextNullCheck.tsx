import { useContext, Context } from 'react'

export function useContextNullCheck<T>(context: Context <T | null>) {
const contextValue = useContext(context);
  if (!contextValue) {
    throw new Error('useMyContext must be used within a Context.Provider');
  }
  return contextValue;
}


