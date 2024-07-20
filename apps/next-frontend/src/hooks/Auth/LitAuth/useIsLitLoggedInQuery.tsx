import { sessionSigsExpired } from "@/utils/app";
import { useQuery } from "@tanstack/react-query";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";

interface IsLitLoggedInQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [IRelayPKP | null | undefined, SessionSigs | null | undefined]
}
export const useIsLitLoggedInQuery = ({queryKey, enabledDeps, queryFnData}: IsLitLoggedInQueryParams) => {

  const [litAccount, sessionSigs] = queryFnData;

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!sessionSigs) {
        console.log("no sessionSigs");
        return false;
      } else if (!litAccount) {
        console.log("no lit account");
        return false;
      } else if (sessionSigsExpired(sessionSigs)) {
        console.log("sessionSigsExpired -- 'isLitLoggedIn'");
        return false
      }
      return true;
    },
    enabled: enabledDeps
  });
};
