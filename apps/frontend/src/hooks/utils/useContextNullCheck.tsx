import { useContext, Context } from 'react';

export function useContextNullCheck<T>(context: Context<T | null>, ...values: (keyof T)[]): T {
  const contextValue = useContext(context);

  if (contextValue === null || contextValue === undefined) {
    throw new Error('useContextNullCheck must be used within a Context.Provider');
  }

  values.forEach(value => {
    if (contextValue[value] === null || contextValue[value] === undefined) {
      throw new Error(`Property '${String(value)}' is null or undefined in the context`);
    }
  });

  // Type guard to assure TypeScript that none of the properties are null or undefined
  if (values.every(value => contextValue[value] !== null && contextValue[value] !== undefined)) {
    return contextValue as T;
  }

  throw new Error('Unexpected error in useContextNullCheck');
}
