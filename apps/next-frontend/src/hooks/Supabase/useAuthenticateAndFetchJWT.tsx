// useAuthenticateAndFetchJWT.ts
import { useEffect, useCallback } from 'react';
import { useRecoilCallback, useRecoilValue, useSetRecoilState } from 'recoil';
import { pkpWalletAtom, userJWTAtom } from '@/atoms/atoms';
import { NonceData } from '@/types/types';
import ky from 'ky';
import { IRelayPKP } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';
import { supabaseJWTSelector } from '@/selectors/supabaseJWTSelector';
import { currentAccountAtom } from '@/atoms/litAccountAtoms';

export function useAuthenticateAndFetchJWT() {
  const pkpWallet = useRecoilValue(pkpWalletAtom);
  const setUserJWT = useSetRecoilState(userJWTAtom);
  const currentAccount = useRecoilValue(currentAccountAtom);
  const initializeFetchJWT = useRecoilCallback(({snapshot, set}) => async () => {

  if (!pkpWallet || !currentAccount) return null;
    try {

      const jwt = await snapshot.getPromise(supabaseJWTSelector)
      const nonceResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce').json<NonceData>();
      const nonce = nonceResponse.nonce;
      const signature = await pkpWallet.signMessage(nonce);
      const jwtResponse = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
        json: { ethereumAddress: currentAccount.ethAddress, signature, nonce },
      }).json<{ token: string }>();
      console.log("JWT Response:", jwtResponse);
      if (jwtResponse.token) {
        setUserJWT(jwtResponse.token);
        console.log("JWT set successfully:", jwtResponse.token);
      } else {
        console.error("Failed to set JWT");
      }
    } catch (e) {
      console.error("Error fetching JWT", e);
    }
  }, [pkpWallet, currentAccount, setUserJWT]);


  return { initializeFetchJWT };
}
