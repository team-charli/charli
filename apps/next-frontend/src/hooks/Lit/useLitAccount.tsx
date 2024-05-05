import { useCallback, useState } from 'react';
import { AuthMethod, IRelayPKP } from '@lit-protocol/types';
import { getPKPs, mintPKP } from '../../utils/lit';
import useLocalStorage from '@rehooks/local-storage';

export default function useLitAccounts() {
  const [currentAccount, setCurrentAccount] = useLocalStorage<IRelayPKP>("currentAccount");
  const [accountsLoading, setLoading] = useState<boolean>(false);
  const [accountsError, setError] = useState<Error>();

  const fetchAccounts = useCallback(
    async (authMethod: AuthMethod): Promise<void> => {
      setLoading(true);
      setError(undefined);
      if (authMethod) {
        try {
          const myPKPs = await getPKPs(authMethod).catch(error => {console.error(error); throw new Error('error getPKPs')});
          console.log('myPKPs', myPKPs)
          if (myPKPs.length) {
            console.log("setting currentAccount");
            localStorage.setItem("currentAccount", JSON.stringify(myPKPs[0]));
            setCurrentAccount(myPKPs[0]);
          } else {
            const newPKP = await mintPKP(authMethod);
            console.log('createAccount pkp: ', newPKP);
            setCurrentAccount(newPKP);
          }
        } catch (err) {
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      }
    },
    []
  );

  return {
    currentAccount,
    fetchAccounts,
    accountsLoading,
    accountsError,
  };
}
