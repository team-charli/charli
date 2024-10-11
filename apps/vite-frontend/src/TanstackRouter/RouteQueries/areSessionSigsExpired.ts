import {validateSessionSigs} from '@lit-protocol/misc'
import { SessionSigs } from "@lit-protocol/types";
import { QueryClient } from "@tanstack/query-core";


export const areSessionSigsExpired = (queryClient: QueryClient ): boolean => {
  const sessionSigs = queryClient.getQueryData(['litSessionSigs']) as SessionSigs | null | undefined;

  const currentTime = new Date().getTime();

  if (!sessionSigs) return true;
  const sessionSigsValidationResult = validateSessionSigs(sessionSigs);
  if (sessionSigsValidationResult.isValid === true) {
    return false
  } else {
    console.log("sessionSigs Expired",sessionSigsValidationResult.errors )
    return true;
  }

}

