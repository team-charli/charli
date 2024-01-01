import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import ky from 'ky';
import { useState } from 'react';
import { useAsyncEffect } from "../utils/useAsyncEffect";

interface NonceData {
  nonce: string;
}

export const useFetchNonce = (currentAccount: IRelayPKP | null, sessionSigs: SessionSigs | null) => {
  const [nonce, setNonce] = useState<string | null>(null);

  useAsyncEffect(async () => {
    if (currentAccount && sessionSigs) {
      try {
        const response = await ky('https://supabase-auth.zach-greco.workers.dev/nonce');
        const data: NonceData = await response.json(); // Cast the response to NonceData
        setNonce(data.nonce); // Use data.nonce, ensuring TypeScript knows about the nonce property
      } catch (error) {
        console.error('Error fetching nonce:', error);
      }
    }
  }, async () => { /* Unmount cleanup logic here */ }, [currentAccount, sessionSigs]); // Correctly passing dependencies array

  return nonce;
};
