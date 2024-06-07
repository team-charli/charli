// src/utils/parseAuthMethodFromCookie.ts
import { AuthMethod } from '@lit-protocol/types';

export function parseAuthMethodFromCookie(cookieString: string): AuthMethod | null {
  const cookies = cookieString.split('; ');
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'authMethod') {
      return JSON.parse(decodeURIComponent(value));
    }
  }
  return null;
}
