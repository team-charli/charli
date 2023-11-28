import { useContext, Context } from 'react';

export function useContextNullCheck<T>(context: Context<T | null>, ...values: (keyof T)[]): T {
  const contextValue = useContext(context);

  // Throw an error if contextValue is null or undefined
  if (contextValue === null || contextValue === undefined) {
    throw new Error('useContextNullCheck must be used within a Context.Provider');
  }

  // Iterate over each value and check if it's null in the contextValue
  values.forEach(value => {
    if (contextValue[value] === null) {
      throw new Error(`Property '${String(value)}' is null in the context`);
    }
  });

  return contextValue;
}
