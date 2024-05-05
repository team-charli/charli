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


export function isJwtExpired(token: string) {
  // Decode the payload
  const payload = JSON.parse(atob(token.split('.')[1]));

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


export const checkIfNotificationExpired = (dateStr: string): boolean => {
  const now = new Date();
  const targetDate = new Date(dateStr);
  return targetDate < now; // Returns true if the targetDate is in the past compared to now
}

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

export function generateUserId() {
  const uniqueData = `ControllerPKP_${Date.now()}`;
  const bytes = ethers.toUtf8Bytes(uniqueData);
  const uniqueId = ethers.keccak256(bytes);
  return `ControllerPKP_${uniqueId}`;
}

type Defaultable<T> = T | null;

export function safeDestructure<T extends object>(result: Defaultable<T>, defaults: T): T {
  if (result === null) {
    return defaults;
  }
  return result;
}

export function calculateSessionCost(sessionDuration: number | undefined) {
  if (!sessionDuration) throw new Error(`sessionDuration undefined`)
  const sessionRate = process.env.NEXT_PUBLIC_SESSION_RATE;
  if (!sessionRate) throw new Error("import NEXT_PUBLIC_SESSION_RATE undefined")
  return  parseInt(sessionRate) * sessionDuration;
}

export function verifyRoleAndAddress(hashed_teacher_address:string | undefined, hashed_learner_address: string | undefined, roomRole: "learner" | "teacher", currentAccount: IRelayPKP) {
  if (roomRole === 'teacher' && currentAccount?.ethAddress && hashed_teacher_address === ethers.keccak256(currentAccount?.ethAddress) ) {
    return {verifiedRole: 'teacher'};
  } else if (roomRole === 'learner' && currentAccount?.ethAddress && hashed_learner_address === ethers.keccak256(currentAccount.ethAddress)) {
    return { verifiedRole: 'learner' }
  } else {throw new Error("you're busted")}
}

export function sessionSigsExpired(sessionSigs: SessionSigs | null): boolean {
  if (!sessionSigs) {
    return true;
  }
  const currentTime = new Date().getTime();
  for (const key in sessionSigs) {
    if (sessionSigs.hasOwnProperty(key)) {
      const signedMessage = JSON.parse(sessionSigs[key].signedMessage);
      const expirationTime = new Date(signedMessage.expiration).getTime();

      const timeUntilExpire = formatTimeUntilExpire(expirationTime - currentTime);

      // console.log(JSON.stringify({
      //   timeUntilExpire,
      //   signedMessage_expiration: signedMessage.expiration,
      //   current_time: new Date()
      // }));

      if (currentTime >= expirationTime) {
        // localStorage.removeItem("sessionSigs")
        // localStorage.removeItem("currentAccount")
        // localStorage.removeItem("lit-wallet-sig")
        // localStorage.removeItem("lit-session-key")
        return true;
      }
    }
  }

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
