import { AuthMethodPlus, NotificationIface } from '@/types/types';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import bs58 from 'bs58';
import {ethers} from 'ethers';

export function isDefined<T>(value: T | undefined): value is T {
  return typeof value !== 'undefined';
}

export function deduplicateLanguages(languages: string[]) {
  const seen = new Set();
  return languages.filter(lang => {
    const baseLang = lang.substring(0, 2).toLowerCase();
    if (seen.has(baseLang)) {
      return false;
    }
    seen.add(baseLang);
    return true;
  });
}


export function isJwtExpired(token: string): boolean {
  // Decode the payload
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(Buffer.from(base64, 'base64').toString());

  // Get the current time in seconds
  const currentTime = Date.now() / 1000;

  // Check if the token is expired
  return payload.exp < currentTime;
}

export const formatDateTimeLocal = (date: Date): string => {
  const ten = (i: number): string => (i < 10 ? '0' : '') + i;
  const YYYY: string = date.getFullYear().toString();
  const MM: string = ten(date.getMonth() + 1); // Months are 0-indexed in JavaScript Date objects
  const DD: string = ten(date.getDate());
  const HH: string = ten(date.getHours());
  const mm: string = ten(date.getMinutes());

  return `${YYYY}-${MM}-${DD}T${HH}:${mm}`;
};



export const convertUtcToLocalTime = (utcTime: string) => {
  const localDateTime = new Date(utcTime);
  const utcDateTime = localDateTime.toISOString();
  return utcDateTime
}

export const convertLocalTimetoUtc = (localTime: string) => {
  const localDateTime = new Date(localTime);
  const utcDateTime = localDateTime.toISOString();
  return utcDateTime
}

export const formatUtcTimestampToLocalStrings = (utcTimestamp: string | undefined | null): { formattedDate: string, formattedTime: string } => {
  if (!utcTimestamp) {
    throw new Error('undefined timestamp')
  }
  const date = new Date(utcTimestamp);

  // Formatting the date to "<weekday> <date>"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(date);

  // Formatting the time to "<time in 12 hr format>"
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);

  return { formattedDate, formattedTime };
};

export function getBytesFromMultihash(multihash: string): string {
  const decoded = bs58.decode(multihash);
  return `0x${Buffer.from(decoded).toString("hex")}`;
}


export function calculateSessionCost(sessionDuration: string | undefined) {
  if (!sessionDuration) throw new Error(`sessionDuration undefined`)
  const SCALING_FACTOR = 6; // Number of decimal places for USDC
  const RATE_PER_MINUTE = ethers.parseUnits('0.3', SCALING_FACTOR);

  const sessionRate = ethers.parseUnits('0.3', SCALING_FACTOR);

  if (!sessionRate) throw new Error("import NEXT_PUBLIC_SESSION_RATE undefined")
  const durationScaled = ethers.parseUnits(sessionDuration.toString(), SCALING_FACTOR);
  const scaledCost = durationScaled * RATE_PER_MINUTE;
  return scaledCost;
}

export function verifyRoleAndAddress(hashed_teacher_address:string | undefined, hashed_learner_address: string | undefined, roomRole: "learner" | "teacher", currentAccount: IRelayPKP) {
  if (roomRole === 'teacher' && currentAccount?.ethAddress && hashed_teacher_address === ethers.keccak256(currentAccount?.ethAddress) ) {
    return {verifiedRole: 'teacher'};
  } else if (roomRole === 'learner' && currentAccount?.ethAddress && hashed_learner_address === ethers.keccak256(currentAccount.ethAddress)) {
    return { verifiedRole: 'learner' }
  } else {throw new Error("you're busted")}
}

export function sessionSigsExpired(sessionSigs: SessionSigs | null | undefined): boolean {
  const caller = new Error().stack?.split('\n')[2].trim().split(' ')[1] || 'unknown';

  if (!sessionSigs) {
    console.log(`sessionSigsExpired function: no sessionSigs`);
    return true;
  }

  const currentTime = new Date().getTime();
  for (const key in sessionSigs) {
    if (sessionSigs.hasOwnProperty(key)) {
      const signedMessage = JSON.parse(sessionSigs[key].signedMessage);
      const expirationTime = new Date(signedMessage.expiration).getTime();
      const timeUntilExpire = formatTimeUntilExpire(expirationTime - currentTime);

      // console.log(`sessionSigsExpired check: ${timeUntilExpire}`);

      if (currentTime >= expirationTime) {
        console.log(`sessionSigsExpired (${caller}): ${key} has expired`);
        return true;
      }
    }
  }
  // console.log(`sessionSigs not expired`);
  return false;
}

function formatTimeUntilExpire(milliseconds: number): string {
  const isExpired = milliseconds < 0;
  const absoluteMilliseconds = Math.abs(milliseconds);
  const seconds = Math.floor(absoluteMilliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;
  const remainingHours = hours % 24;
  const timeComponents = [];
  if (days > 0) {
    timeComponents.push(`${days} day${days > 1 ? 's' : ''}`);
  }
  if (remainingHours > 0) {
    timeComponents.push(`${remainingHours} hour${remainingHours > 1 ? 's' : ''}`);
  }
  if (remainingMinutes > 0) {
    timeComponents.push(`${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`);
  }
  if (remainingSeconds > 0 || timeComponents.length === 0) {
    timeComponents.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
  }
  const formattedTime = timeComponents.join(', ');
  return isExpired ? `expired ${formattedTime} ago` : `expires in ${formattedTime}`;
}

export function getAuthSigFromLocalStorage(): any | null {
  const authSigString = localStorage.getItem('lit-wallet-sig');
  if (!authSigString) return null;
  try {
    return JSON.parse(authSigString);
  } catch (error) {
    console.error('Error parsing AuthSig from local storage:', error);
    return null;
  }
}

export function checkAuthSigExpiration(authSig: any): boolean {
  if (!authSig) {
    console.log('no authSig')
    // return true; // Treat as expired if we don't have a valid AuthSig

  } else if (!authSig.signedMessage){
    console.log('no signedMessage in authSig');
    // return true; // Treat as expired if we don't have a valid AuthSig
  }

  // Parse the signedMessage to extract the expiration time
  const expirationMatch = authSig.signedMessage.match(/Expiration Time: (.+)Z/);
  if (!expirationMatch) {
    console.log('No expiration time found in AuthSig');
    return true; // Treat as expired if we can't find the expiration time
  }

  const expirationTime = new Date(expirationMatch[1]).getTime();
  const currentTime = Date.now();

  // console.log(`AuthSig expires at: ${new Date(expirationTime)}`);
  // console.log(`Current time: ${new Date(currentTime)}`);

  if (currentTime >= expirationTime) console.log('authSig expired')
  return currentTime >= expirationTime;
}


export function hasSessionKey(): boolean {
  // Check if window and localStorage are available
  if (typeof window !== 'undefined' && window.localStorage) {
    const sessionKey = localStorage.getItem('lit-session-key');
    return sessionKey !== null && sessionKey.length > 100;
  }
  // Return false if localStorage is not available (i.e., during SSR)
  return false;
}

export function hasTanstackQueryStorage() {
  const prefix = "tanstack-query-";
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      return true; // A key with the prefix exists
    }
  }
  return false; // No matching keys found
}

export const getSignificantDate = (notification: NotificationIface): Date => {
  if (notification.confirmed_time_date) {
    return new Date(notification.confirmed_time_date);
  } else if (notification.counter_time_date) {
    return new Date(notification.counter_time_date);
  } else {
    return new Date(notification.request_time_date);
  }
};

export function isTokenExpired(authMethod: AuthMethodPlus, thresholdSeconds: number = 0): boolean {
  if (!authMethod.idToken) {
    console.warn('No ID token available to check expiration.');
    return true; // Assume expired if no ID token is available
  }

  try {
    const [, payloadBase64] = authMethod.idToken.split('.');
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    if (payload.exp) {
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      return currentTime >= expirationTime - thresholdSeconds * 1000;
    } else {
      console.warn('No expiration claim found in the ID token.');
      return true; // Assume expired if no expiration claim is present
    }
  } catch (error) {
    console.error('Error parsing ID token:', error);
    return true; // Assume expired if parsing fails
  }
}
