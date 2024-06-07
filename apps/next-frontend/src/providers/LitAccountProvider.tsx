// src/app/LitAccountProvider.tsx
import { ReactNode } from 'react';
import { AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '../utils/lit';

interface LitAccountProviderProps {
  children: (props: { currentAccount: IRelayPKP | null }) => ReactNode;
  authMethod: AuthMethod | null;
}

export default async function LitAccountProvider({ children, authMethod }: LitAccountProviderProps) {
  let currentAccount: IRelayPKP | null = null;

  const fetchAccounts = async (authMethod: AuthMethod): Promise<IRelayPKP | null> => {
    try {
      const myPKPs = await getPKPs(authMethod);
      console.log('myPKPs', myPKPs);
      if (myPKPs.length) {
        console.log("setting currentAccount");
        return myPKPs[0];
      } else {
        const newPKP = await mintPKP(authMethod);
        console.log('createAccount pkp: ', newPKP);
        return newPKP;
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
    return null;
  };

  if (authMethod) {
    currentAccount = await fetchAccounts(authMethod);
  }

  return <>{children({ currentAccount })}</>;
}
