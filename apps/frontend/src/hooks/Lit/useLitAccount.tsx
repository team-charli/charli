import { useCallback, useState, useEffect } from 'react';
import { AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '../../utils/lit';
import { useAuthContext } from '../../contexts/AuthContext';
import { LocalStorageSetter } from '../../types/types';

export default function useAccounts(currentAccount: IRelayPKP | null, setCurrentAccount: LocalStorageSetter<IRelayPKP> ) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error>();

  /**
   * Fetch PKPs tied to given auth method
   */

  const fetchAccounts = useCallback(
    async (authMethod: AuthMethod): Promise<void> => {
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
    },
    []
  );

  /**
   * Mint a new PKP for current auth method
   */
  const createAccount = useCallback(
    async (authMethod: AuthMethod): Promise<void> => {
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

