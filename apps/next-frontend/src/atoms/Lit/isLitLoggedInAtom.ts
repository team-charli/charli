import { atom } from 'jotai';
import { sessionSigsExpired } from "@/utils/app";
import { fetchLitAccountsAtom } from './litAccountsAtomQuery';
import { litSessionAtom } from './sessionSigsAtomQuery';

export const isLitLoggedInAtom = atom((get) => {
  const currentAccount = get(fetchLitAccountsAtom).data;
  const sessionSigs = get(litSessionAtom).data;
  return !!currentAccount && !!sessionSigs && !sessionSigsExpired(sessionSigs);
});
