import { useContext, Context } from 'react';

type NonNullableProperties<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function useContextNullCheck<T>(context: Context<T | null>, ...values: (keyof T)[]): NonNullableProperties<T> {
  const contextValue = useContext(context);

  if (!isNotNullOrUndefined(contextValue)) {
    throw new Error('useContextNullCheck must be used within a Context.Provider');
  }

  values.forEach(value => {
    if (!isNotNullOrUndefined(contextValue[value])) {
      throw new Error(`Property '${String(value)}' is null or undefined in the context`);
    }
  });

  return contextValue as NonNullableProperties<T>;
}
