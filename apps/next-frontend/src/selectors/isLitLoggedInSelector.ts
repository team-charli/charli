import { currentAccountAtom } from "@/atoms/litAccountAtoms";
import { sessionSigsAtom } from "@/atoms/litSessionAtoms";
import { sessionSigsExpired } from "@/utils/app";
import { selector } from "recoil";

export const isLitLoggedInSelector = selector({
  key: 'isLitLoggedInSelector',
  get:  ({get})  => {
    const currentAccount = get(currentAccountAtom);
    const sessionSigs = get(sessionSigsAtom);
    return currentAccount && sessionSigs && sessionSigsExpired(sessionSigs);
  }
});
