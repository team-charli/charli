import { usePkpWallet } from "@/contexts/AuthContext";
import {  useQuery } from "@tanstack/react-query";

export const useSignSessionDuration = (sessionDuration: number) => {
  const {data: pkpWallet} = usePkpWallet();
  return useQuery({
    queryKey: ['signSessionDuration', sessionDuration],
    queryFn: async () => {
      try {
        return await pkpWallet.signMessage(String(sessionDuration));
      } catch (e) {
        console.error(e);
        throw new Error('failed to sign session duration')
      }
    }
  })
}

