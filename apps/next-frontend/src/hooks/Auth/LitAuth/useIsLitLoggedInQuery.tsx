import { sessionSigsExpired } from "@/utils/app";
import { useQuery } from "@tanstack/react-query";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";

interface IsLitLoggedInQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [IRelayPKP | null, SessionSigs | null]
}
export const useIsLitLoggedInQuery = ({queryKey, enabledDeps, queryFnData}: IsLitLoggedInQueryParams) => {

  const [litAccount, sessionSigs] = queryFnData;
  return useQuery({
    queryKey,
    queryFn: () => {
      if (!sessionSigs || !litAccount) {
        console.log("isLitLoggedIn === false: ", {sessionSigs: !!sessionSigs, litAccount: !!litAccount})
        return false;
      }
      return !sessionSigsExpired(sessionSigs);
    },
    enabled: enabledDeps
  });
};
