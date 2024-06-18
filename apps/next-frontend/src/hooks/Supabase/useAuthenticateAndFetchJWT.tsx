// useAuthenticateAndFetchJWT.ts
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { currentAccountAtom, litNodeClientAtom, pkpWalletAtom, userJWTAtom } from '@/atoms/atoms';
import { NonceData } from '@/types/types';
import ky from 'ky';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP } from '@lit-protocol/types';

export function useAuthenticateAndFetchJWT() {
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount')
  const pkpWallet = useRecoilValue(pkpWalletAtom);
  const litNodeClient = useRecoilValue(litNodeClientAtom);
  const setUserJWT = useSetRecoilState(userJWTAtom);

  const fetchJWT = async () => {
    try {
      console.log("Fetching JWT...");
      if (pkpWallet && currentAccount && litNodeClient.ready) {
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
      } else {
        console.log("Conditions not met for fetching JWT");
      }
    } catch (e) {
      console.error("Error fetching JWT", e);
    }
  };

  return { fetchJWT };
}
