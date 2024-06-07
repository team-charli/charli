// src/actions/sessionSigsAction.ts
'use server';

import { cookies } from 'next/headers';
import { SessionSigs } from '@lit-protocol/types';

export async function getSessionSigsAction(): Promise<SessionSigs | null> {
  const cookieStore = cookies();
  const sessionSigsCookie = cookieStore.get('sessionSigs');
  if (sessionSigsCookie) {
    return JSON.parse(sessionSigsCookie.value) as SessionSigs;
  }
  return null;
}

export async function setSessionSigsAction(sessionSigs: SessionSigs) {
  const cookieStore = cookies();
  cookieStore.set('sessionSigs', JSON.stringify(sessionSigs), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
