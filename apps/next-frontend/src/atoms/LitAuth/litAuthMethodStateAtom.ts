import { createQueryAtom } from "@/utils/queryAtomUtils";
import { AuthMethod } from "@lit-protocol/types";
import { atom } from "jotai";

export const litAuthMethodAtoms = createQueryAtom<AuthMethod>({
  data: null,
  error: undefined,
  isLoading: false,
});

export const signInInitiatedAtom = atom<boolean>(false);

