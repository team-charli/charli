import { useHasBalance } from "./HasBalance/useHasBalance";
import { useIsOnboarded } from "./IsOnboarded/useIsOnboarded";
import { useLitAccountQuery } from "./LitAuth/useLitAccountQuery";
import { useLitAuthMethodQuery } from "./LitAuth/useLitAuthMethodQuery";
import { useLitNodeClientReadyQuery } from "./LitAuth/useLitNodeClientReadyQuery";
import { useLitSessionSigsQuery } from "./LitAuth/useLitSessionSigsQuery";
import { usePkpWallet } from "./PkpWallet/usePkpWallet";
import { useNonce } from "./SupabaseClient/useNonce";
import { useSignature } from "./SupabaseClient/useSignature";
import { useSupabaseClient } from "./SupabaseClient/useSupabaseClient";
import { useSupabaseJWT } from "./SupabaseClient/useSupabaseJWT";

export const useAuthChain = () => {
  const litNodeClientQuery = useLitNodeClientReadyQuery();
  const authMethodQuery = useLitAuthMethodQuery();
  const litAccountQuery = useLitAccountQuery();
  const sessionSigsQuery = useLitSessionSigsQuery();
  const pkpWalletQuery = usePkpWallet();
  const nonceQuery = useNonce();
  const signatureQuery = useSignature();
  const supabaseJWTQuery = useSupabaseJWT();
  const supabaseClientQuery = useSupabaseClient();
  const isOnboardedQuery = useIsOnboarded();
  const hasBalanceQuery = useHasBalance();

  const queries = [
    { name: 'litNodeClient', query: litNodeClientQuery },
    { name: 'authMethod', query: authMethodQuery },
    { name: 'litAccount', query: litAccountQuery },
    { name: 'sessionSigs', query: sessionSigsQuery },
    { name: 'pkpWallet', query: pkpWalletQuery },
    { name: 'nonce', query: nonceQuery },
    { name: 'signature', query: signatureQuery },
    { name: 'supabaseJWT', query: supabaseJWTQuery },
    { name: 'supabaseClient', query: supabaseClientQuery },
    { name: 'isOnboarded', query: isOnboardedQuery },
    { name: 'hasBalance', query: hasBalanceQuery },
  ];

  const isLoading = queries.some(q => q.query.isLoading);
  const isError = queries.some(q => q.query.isError);
  const isSuccess = !isLoading && !isError;

  return {
    queries,
    isLoading,
    isError,
    isSuccess
  };
};
