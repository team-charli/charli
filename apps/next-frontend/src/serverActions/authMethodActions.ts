// src/actions/setAuthMethodAction.ts
'use server';

import { cookies } from 'next/headers';
import { AuthMethod } from '@lit-protocol/types';

export async function setAuthMethodAction(authMethod: AuthMethod | null) {
  const cookieStore = cookies();
  cookieStore.set('authMethod', JSON.stringify(authMethod));
}
