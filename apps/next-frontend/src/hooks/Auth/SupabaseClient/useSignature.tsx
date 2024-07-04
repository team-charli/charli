import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { pkpWalletAtom, nonceAtom, signatureAtom } from '@/atoms/atoms';

export const useSignature = () => {
  const pkpWallet = useAtomValue(pkpWalletAtom);
  const nonce = useAtomValue(nonceAtom);
  const setSignature = useSetAtom(signatureAtom);

  return useQuery({
    queryKey: ['signature'],
    queryFn: async (): Promise<string> => {
      console.log("6a: start signature query");
      if (!pkpWallet) throw new Error('PKP Wallet not available');
      if (!nonce) throw new Error('Nonce not available');
      const signature = await pkpWallet.signMessage(nonce);
      setSignature(signature);
      console.log(`6b: signature query finish`);
      return signature;
    },
    enabled: !!pkpWallet && !!nonce,
  });
};
