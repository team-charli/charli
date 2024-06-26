// src/utils/queryAtomUtils.ts
import { atom } from 'jotai';
import { QueryAtoms, QueryState } from '@/types/types';


export const createQueryAtom = <T>(initialState: QueryState<T>): QueryAtoms<T> => {
  const baseAtom = atom<QueryState<T>>(initialState);

  return {
    state: baseAtom,
    value: atom((get) => get(baseAtom).value)
  };
};
