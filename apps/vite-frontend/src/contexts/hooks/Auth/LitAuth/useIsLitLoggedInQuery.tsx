import { sessionSigsExpired } from "@/utils/app";
import { useQuery } from "@tanstack/react-query";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import { authChainLogger } from "@/App";
import useLocalStorage from "@rehooks/local-storage";

interface IsLitLoggedInQueryParams {
  queryKey: [string];
  enabledDeps: boolean;
  queryFnData: [IRelayPKP | null | undefined, SessionSigs | null | undefined],
}
export const useIsLitLoggedInQuery = ({queryKey, enabledDeps, queryFnData}: IsLitLoggedInQueryParams) => {
  const [_, _2, removeSessionInitialized] = useLocalStorage<boolean>('session-init');

  const [litAccount, sessionSigs] = queryFnData;

  return useQuery({
    queryKey,
    queryFn: async () => {
      authChainLogger.info("5a: start isLitLoggedIn query");

      if (!sessionSigs) {
        authChainLogger.info("5b: finish isLitLoggedIn query -- no sessionSigs");
        return false;
      } else if (!litAccount) {
        authChainLogger.info("5b: finish isLitLoggedIn query --no lit account");
        return false;
      } else if (sessionSigsExpired(sessionSigs)) {
        authChainLogger.info("5b: finish isLitLoggedIn query --sessionSigsExpired -- 'isLitLoggedIn'");
        return false
      }
      authChainLogger.info("5b: finish isLitLoggedIn query -- true ");
      removeSessionInitialized()
      return true;
    },
    enabled: enabledDeps
  });
};
