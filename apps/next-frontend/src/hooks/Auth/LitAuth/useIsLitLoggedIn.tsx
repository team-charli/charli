import { sessionSigsExpired } from "@/utils/app";
import { useQuery } from "@tanstack/react-query";
import { useLitAccountQuery } from "./useLitAccountQuery";
import { useLitSessionSigsQuery } from "./useLitSessionSigsQuery";
import { useAtomValue } from "jotai";
import { litAccountAtom, sessionSigsAtom } from "@/atoms/atoms";

export const useIsLitLoggedIn = () => {
  const sessionSigs = useAtomValue(sessionSigsAtom);
  const litAccount = useAtomValue(litAccountAtom);

  return useQuery({
    queryKey: ['isLitLoggedIn', sessionSigs, litAccount],
    queryFn: () => {
      if (!sessionSigs || !litAccount) {
        return false;
      }
      return !sessionSigsExpired(sessionSigs);
    },
    enabled: !!sessionSigs && !!litAccount,
  });
};
