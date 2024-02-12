import { useCallback, useState, useEffect } from 'react';
import { AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '../../utils/lit';
import { LocalStorageSetter } from '../../types/types';
import { useNetwork } from '../../contexts/NetworkContext';

export default function useLitAccounts(currentAccount: IRelayPKP | null, setCurrentAccount: LocalStorageSetter<IRelayPKP> ) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error>();
  // const { isOnline } = useNetwork();

  /**
   * Fetch PKPs tied to given auth method
   */

  const fetchAccounts = useCallback(
    async (authMethod: AuthMethod): Promise<void> => {
      // if (isOnline) {
        setLoading(true);
        setError(undefined);
        try {
          const myPKPs = await getPKPs(authMethod);
          if (myPKPs.length){
            console.log("setting currentAccount")
            localStorage.setItem("currentAccount", JSON.stringify(myPKPs[0]))
            setCurrentAccount(myPKPs[0])
          }
        } catch (err) {
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      // }
    },
    []
  );

  /**
   * Mint a new PKP for current auth method
   */
  const createAccount = useCallback(
    async (authMethod: AuthMethod): Promise<void> => {
      // if (isOnline) {
        setLoading(true);
        setError(undefined);
        try {
          const newPKP = await mintPKP(authMethod);
          localStorage.setItem("currentAccount", JSON.stringify(newPKP))
        } catch (err) {
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      // }
    },
    []
  );

  return {
    currentAccount,
    fetchAccounts,
    createAccount,
    loading,
    error,
  };
}

