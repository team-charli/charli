import { useRecoilValue, useRecoilCallback } from 'recoil';
import {
  authMethodAtom,
  authLoadingAtom,
  authErrorAtom,
  signInInitiatedAtom
} from '@/atoms/litAuthenticateAtoms';
import {
  currentAccountAtom,
  accountsLoadingAtom,
  accountsErrorAtom
} from '@/atoms/litAccountAtoms';
import {
  sessionSigsAtom,
  sessionSigsLoadingAtom,
  sessionSigsErrorAtom
} from '@/atoms/litSessionAtoms';
import { authenticateSelector } from '@/selectors/litAuthenticateSelector';
import { fetchAccountsSelector } from '@/selectors/litAccountSelector';
import { litSessionSelector } from '@/selectors/litSessionSelector';

export function useLitAuthChain() {
  // Authentication state
  const authMethod = useRecoilValue(authMethodAtom);
  const authLoading = useRecoilValue(authLoadingAtom);
  const authError = useRecoilValue(authErrorAtom);

  // Account state
  const currentAccount = useRecoilValue(currentAccountAtom);
  const accountsLoading = useRecoilValue(accountsLoadingAtom);
  const accountsError = useRecoilValue(accountsErrorAtom);

  // Session state
  const sessionSigs = useRecoilValue(sessionSigsAtom);
  const sessionSigsLoading = useRecoilValue(sessionSigsLoadingAtom);
  const sessionSigsError = useRecoilValue(sessionSigsErrorAtom);

 const initiateAuthChain = useRecoilCallback(({ snapshot, set }) => async () => {
    try {
      const signInInitiated = await snapshot.getPromise(signInInitiatedAtom);
      if (!signInInitiated) return;

      // Step 1: Authenticate
      const authMethod = await snapshot.getPromise(authenticateSelector);
      if (!authMethod) throw new Error("Authentication failed");
      set(authMethodAtom, authMethod);

      // Step 2: Fetch Account
      const account = await snapshot.getPromise(fetchAccountsSelector);
      set(currentAccountAtom, account);

      // Step 3: Get Session Signatures
      const sessionSigs = await snapshot.getPromise(litSessionSelector);
      set(sessionSigsAtom, sessionSigs);

      console.log("Auth chain completed successfully");
    } catch (error) {
      console.error("Auth chain error:", error);
      // Here you could set error states for each step if needed
    }
  }, []);

  return {
    // Authentication state
    authMethod,
    authLoading,
    authError,
    // Account state
    currentAccount,
    accountsLoading,
    accountsError,
    // Session state
    sessionSigs,
    sessionSigsLoading,
    sessionSigsError,
    // Initiate auth chain function
    initiateAuthChain,
  };
}
