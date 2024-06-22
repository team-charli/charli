import { onboardStatusAtom } from "@/atoms/userDataAtoms";
import { selector } from "recoil";

export const isOnboardedSelector = selector<boolean>({
  key: 'isOnboardedSelector',
  get: ({ get }) => get(onboardStatusAtom).isOnboarded,
});
