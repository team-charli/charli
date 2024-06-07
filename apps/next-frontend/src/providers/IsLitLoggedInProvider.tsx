// src/app/providers/LitLoggedInProvider.tsx
import { ReactNode } from 'react';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { sessionSigsExpired } from '@/utils/app';

interface LitLoggedInProviderProps {
  children: (props: { isLitLoggedIn: boolean }) => ReactNode;
  currentAccount: IRelayPKP | null;
  sessionSigs: SessionSigs | null;
}

export default function LitLoggedInProvider({ children, currentAccount, sessionSigs }: LitLoggedInProviderProps) {
  const isLitLoggedIn = !!currentAccount && !!sessionSigs && !sessionSigsExpired(sessionSigs);
  return <>{children({ isLitLoggedIn })}</>;
}
