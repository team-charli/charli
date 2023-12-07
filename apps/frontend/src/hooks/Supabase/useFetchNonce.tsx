import ky, { KyResponse } from 'ky';
import { useState } from 'react'
import { useAsyncEffect } from "../utils/useAsyncEffect"

interface NonceData {
  nonce: string;
}

export const useFetchNonce = () => {
  const [nonce, setNonce] = useState<string | null>(null);
  useAsyncEffect(
    async () => {
      try {
        const response: KyResponse = await ky('https://supabase-auth.zach-greco.workers.dev/nonce')
        const {nonce}: NonceData = await response.json()
        setNonce(nonce )
      } catch (error) {
      }
    },
    async () => Promise.resolve(),
  )
  return nonce;
}
