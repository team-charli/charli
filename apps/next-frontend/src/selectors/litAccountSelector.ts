import { selector } from 'recoil';
import { authMethodAtom } from '@/atoms/litAuthenticateAtoms';
import { getPKPs, mintPKP } from '@/utils/lit';
import { accountsErrorAtom, accountsLoadingAtom, currentAccountAtom } from '@/atoms/litAccountAtoms';

export const fetchAccountsSelector = selector({
  key: 'fetchAccountsSelector',
  get: async ({ get }) => {
    const authMethod = get(authMethodAtom);
    if (!authMethod) throw new Error('No auth method available');

    try {
      const myPKPs = await getPKPs(authMethod);
      if (myPKPs.length) {
        return myPKPs[0];
      } else {
        return await mintPKP(authMethod);
      }
    } catch (error) {
      throw error;
    }
  },
  set: ({ set }, newValue) => {
    if (newValue instanceof Error) {
      set(accountsErrorAtom, newValue);
    } else {
      set(currentAccountAtom, newValue);
    }
    set(accountsLoadingAtom, false);
  },
});
