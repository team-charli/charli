import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import ky from 'ky';
import { useAsyncEffect } from "../utils/useAsyncEffect";
import useLocalStorage from '@rehooks/local-storage';

interface NonceData {
  nonce: string;
}

export const useFetchNonce = (currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null, cachedJWT: string | null) => {

  const [nonce, setNonce] = useLocalStorage<string | null>("nonce")

  useAsyncEffect(
    async () => {

    if (currentAccount && sessionSigs && (cachedJWT === null || Object.keys(cachedJWT).length === 0) && (nonce === null || nonce.length === 0)) {

      try {
        const response = await ky('https://supabase-auth.zach-greco.workers.dev/nonce');
        const data: NonceData = await response.json(); // Cast the response to NonceData
        console.log('setNonce')
        setNonce(data.nonce)

      } catch (error) {
        console.error('Error fetching nonce:', error);
      }
    }
  },
  async () => {},
  [currentAccount, sessionSigs, cachedJWT, nonce]
  );
  return nonce
};
