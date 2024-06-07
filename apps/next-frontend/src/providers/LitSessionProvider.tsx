// src/app/LitSessionProvider.tsx
import { ReactNode } from 'react';
import { AuthMethod, SessionSigs } from '@lit-protocol/types';
import { getProviderByAuthMethod } from '../utils/lit';
import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { IRelayPKP } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { cookies } from 'next/headers';
import { sessionSigsExpired } from '@/utils/app';

interface LitSessionProviderProps {
  children: (props: { sessionSigs: SessionSigs | null }) => ReactNode;
  authMethod: AuthMethod | null;
  currentAccount: IRelayPKP | null;
}

export default async function LitSessionProvider({ children, authMethod, currentAccount }: LitSessionProviderProps) {
  const initSession = async (authMethod: AuthMethod, pkp: IRelayPKP): Promise<void> => {
    try {
      const provider = getProviderByAuthMethod(authMethod);
      if (!provider) {
        throw new Error('No provider object');
      }
      if (provider && pkp?.publicKey && authMethod) {
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
            pkpPublicKey: pkp.publicKey,
            authMethods: [authMethod],
            resourceAbilityRequests: resourceAbilityRequests,
          });
          await setSessionSigs(sessionSigs);
        } catch (error) {
          console.error('Error in litNodeClient.getPkpSessionSigs:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('initSession error:', error);
    }
  };

  const getSessionSigs = async (): Promise<SessionSigs | null> => {
    const sessionSigsCookie = cookies().get('sessionSigs');
    if (sessionSigsCookie) {
      return JSON.parse(sessionSigsCookie.value) as SessionSigs;
    }
    return null;
  };

  const setSessionSigs = async (sessionSigs: SessionSigs): Promise<void> => {
    cookies().set('sessionSigs', JSON.stringify(sessionSigs), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  };

  let sessionSigs = await getSessionSigs();
  if (authMethod && currentAccount) {
    if (sessionSigs && sessionSigsExpired(sessionSigs)) {
      // Session has expired, refresh the session
      await initSession(authMethod, currentAccount);
      sessionSigs = await getSessionSigs();
    } else if (!sessionSigs) {
      // Session doesn't exist, initialize a new session
      await initSession(authMethod, currentAccount);
      sessionSigs = await getSessionSigs();
    }
  }

  return <>{children({ sessionSigs })}</>;
}
