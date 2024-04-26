import { AuthSig, IRelayPKP, SessionSigs, AuthMethod } from '@lit-protocol/types';
import useLocalStorage from "@rehooks/local-storage";

export const useRehydrate = () => {
  // Retrieve and parse the values from local storage
  const [currentAccount, setCurrentAccount] = useLocalStorage<IRelayPKP>("currentAccount");
  const [sessionSigs, setSessionSigs] = useLocalStorage<SessionSigs>("sessionSigs");
  const [authSig, setAuthSig] = useLocalStorage<AuthSig>("lit-wallet-sig");

  const [authMethod, setAuthMethod] = useLocalStorage<AuthMethod>('authMethod')

  return {currentAccount, sessionSigs, authSig, setCurrentAccount, setSessionSigs, setAuthSig, authMethod, setAuthMethod}
}


