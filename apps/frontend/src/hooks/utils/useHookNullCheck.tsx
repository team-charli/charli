import { useEffect } from 'react';

export const useHookNullCheck = <T, K extends keyof T>(
  useHookFunction: () => T,
  ...fieldsToCheck: K[]
) => {
  const hookResult = useHookFunction();

  useEffect(() => {
    fieldsToCheck.forEach(field => {
      if (hookResult[field] === null || hookResult[field] === undefined) {
        throw new Error(`Field '${String(field)}' is null or undefined`);
      }
    });
  }, [hookResult, ...fieldsToCheck]);

  return hookResult as T extends Record<K, NonNullable<T[K]>> ? T : never;
};
