import { useCallback, useState, useEffect } from 'react';
import { AuthMethod } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '../../utils/lit';
import { IRelayPKP } from '@lit-protocol/types';
import { AuthContext } from '../../contexts/AuthContext'
import { useContextNullCheck } from '../../hooks/utils/useContextNullCheck'
import { useFetchJWT } from '../Supabase/useFetchJWT';

export default function useAccounts() {
  const [accounts, setAccounts] = useState<IRelayPKP[]>([]);
  const {contextCurrentAccount, contextSetCurrentAccount} = useContextNullCheck(AuthContext);
  const [currentAccount, setCurrentAccount] = useState<IRelayPKP>();
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
        setAccounts([myPKPs[0]]);
          setCurrentAccount(myPKPs[0]);
          contextSetCurrentAccount(myPKPs[0]);
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
        if (!accounts.length) {
        const newPKP = await mintPKP(authMethod);
        // console.log('createAccount pkp: ', newPKP);
        setAccounts(prev => [...prev, newPKP]);
        setCurrentAccount(newPKP);
        } else {
          throw new Error("already has account: " + accounts[0])
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    fetchAccounts,
    createAccount,
    setCurrentAccount,
    accounts,
    currentAccount,
    loading,
    error,
  };
}

