import { AuthContextObj  } from '../../types/types'
export const defaultAuthContext: AuthContextObj = {
    authMethod: null, // or a valid default AuthMethod value
    authLoading: false,
    accountsLoading: false,
    sessionLoading: false,
    authError: undefined, // Error | undefined
    accountsError: undefined, // Error | undefined
    sessionError: undefined, // Error | undefined
    currentAccount: null, // IRelayPKP | null
    sessionSigs: null, // SessionSigs | null
    authSig: null, // AuthSig | null
    isLitLoggedIn: false
};

