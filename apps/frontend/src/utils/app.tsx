import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
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
}

export const convertLocalTimetoUtc = (localTime: string) => {
  const localDateTime = new Date(localTime);
  const utcDateTime = localDateTime.toISOString();
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

export function calculateSessionCost(sessionDuration: number) {
  return import.meta.env.SESSION_RATE * sessionDuration;
}

export function checkHashedAddress(currentAccount: IRelayPKP, roomRole: string, hashed_learner_address: string | undefined, hashed_teacher_address:string | undefined)
 {
 if (roomRole === 'teacher' && hashed_teacher_address === ethers.keccak256(currentAccount.ethAddress) ) {
   return true;
  } else if (roomRole === 'learner' && hashed_learner_address === ethers.keccak256(currentAccount.ethAddress)) {
    return true
} else {throw new Error("you're busted")}
}

export async function hasPrepaid(controllerPKPAddress: string, duration: number | undefined): Promise<boolean> {
  if (!duration) {
    throw new Error(`no duration set`)
  }
  const abi = ["function balanceOf(address owner) view returns (uint256)"];
  const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
  const usdcContractInstance = new ethers.Contract(import.meta.env.VITE_USDC_CONTRACT_ADDRESS, abi, provider )
  const balance = await usdcContractInstance.balanceOf(controllerPKPAddress);
  const expectedBalance = ethers.parseUnits(String(calculateSessionCost(duration)), 16);
  if (balance >= expectedBalance){
    return true;
  } else {
    console.log("ControllerPKP balance (simple units)", ethers.formatEther(balance))
    return false;
  }
}
