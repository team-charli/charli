// useAuthenticateAndFetchJWT.ts
import { useEffect, useCallback } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { pkpWalletAtom, userJWTAtom } from '@/atoms/atoms';
import { NonceData } from '@/types/types';
import ky from 'ky';
import { IRelayPKP } from '@lit-protocol/types';
import { litNodeClient } from '@/utils/litClients';

export function useAuthenticateAndFetchJWT(currentAccount: IRelayPKP | null) {
  const pkpWallet = useRecoilValue(pkpWalletAtom);
  const setUserJWT = useSetRecoilState(userJWTAtom);

  const fetchJWT = useCallback(async () => {
    console.log("fetchJWT called", {
      pkpWallet: !!pkpWallet,
      currentAccount: !!currentAccount,
      litNodeClientReady: litNodeClient.ready
    });

    if (!pkpWallet || !currentAccount || !litNodeClient.ready) {
      console.log("Conditions not met for fetching JWT");
      return;
    }

    try {
      console.log("Fetching JWT...");
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

  useEffect(() => {
    console.log("useAuthenticateAndFetchJWT effect", {
      pkpWallet: !!pkpWallet,
      currentAccount: !!currentAccount,
      litNodeClientReady: litNodeClient.ready
    });
  }, [pkpWallet, currentAccount]);

  return { fetchJWT };
}
