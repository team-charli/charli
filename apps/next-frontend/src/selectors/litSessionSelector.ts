import { selector, DefaultValue } from 'recoil';
import { sessionSigsAtom, sessionSigsLoadingAtom, sessionSigsErrorAtom } from '@/atoms/litSessionAtoms';
import { authMethodAtom } from '@/atoms/litAuthenticateAtoms';
import {  SessionSigs} from '@lit-protocol/types';
import { getProviderByAuthMethod } from '@/utils/lit';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { sessionSigsExpired } from '@/utils/app';
import { litNodeClient } from '@/utils/litClients';
import { currentAccountAtom } from '@/atoms/litAccountAtoms';

const updateAtoms = (set: (atom: any, value: any) => void, updates: [any, any][]) => {
  updates.forEach(([atom, value]) => set(atom, value));
};

export const litSessionSelector = selector<SessionSigs | null>({
  key: 'litSessionSelector',
  get: async ({ get }): Promise<SessionSigs | null> => {
    const authMethod = get(authMethodAtom);
    const currentAccount = get(currentAccountAtom);
    const existingSessionSigs = get(sessionSigsAtom);

    if (!authMethod || !currentAccount) {
      throw new Error('Auth method or current account not available');
    }

    if (existingSessionSigs && !sessionSigsExpired(existingSessionSigs)) {
      return existingSessionSigs;
    }

    if (!litNodeClient.ready) {
      await litNodeClient.connect();
    }

    const provider = getProviderByAuthMethod(authMethod);
    if (!provider) {
      throw new Error('No provider object');
    }

    const resourceAbilityRequests = [
      {
        resource: new LitPKPResource('*'),
        ability: LitAbility.PKPSigning,
      },
      {
        resource: new LitActionResource('*'),
        ability: LitAbility.LitActionExecution,
      },
    ];

    try {
      const sessionSigs: SessionSigs = await litNodeClient.getPkpSessionSigs({
        pkpPublicKey: currentAccount.publicKey,
        authMethods: [authMethod],
        resourceAbilityRequests: resourceAbilityRequests
      });

      if (!sessionSigs) {
        throw new Error("Problem getting session sigs");
      }

      return sessionSigs;
    } catch (error) {
      console.error("Error in litNodeClient.getPkpSessionSigs:", error);
      throw error;
    }
  },
  set: ({ set }, newValue: SessionSigs | null | DefaultValue) => {
    if (newValue instanceof DefaultValue) {
      updateAtoms(set, [
        [sessionSigsAtom, null],
        [sessionSigsErrorAtom, undefined],
        [sessionSigsLoadingAtom, false]
      ]);
    } else if (newValue instanceof Error) {
      updateAtoms(set, [
        [sessionSigsAtom, null],
        [sessionSigsErrorAtom, newValue],
        [sessionSigsLoadingAtom, false]
      ]);
    } else {
      updateAtoms(set, [
        [sessionSigsAtom, newValue],
        [sessionSigsErrorAtom, undefined],
        [sessionSigsLoadingAtom, false]
      ]);
    }
  },
});
