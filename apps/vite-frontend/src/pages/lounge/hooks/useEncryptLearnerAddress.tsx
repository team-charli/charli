import {useCallback} from 'react'
import {encryptString} from '@lit-protocol/lit-node-client';
import { litNodeClient } from '@/utils/litClients';
import { usePkpWallet } from '@/contexts/AuthContext';
export const useEncryptLearnerAddress = () => {
  const {data: pkpWallet} = usePkpWallet();
  return useCallback(async () => {
    if (pkpWallet) {
      const accessControlConditions = [
        {
          contractAddress: '',
          standardContractType: '',
          chain: "ethereum",
          method: '',
          parameters: [
            "0x",
          ],
          returnValueTest: {
            comparator: '=',
            value: '0x'
          }
        }
      ]

      const {ciphertext, dataToEncryptHash} = await encryptString({dataToEncrypt: pkpWallet.address, accessControlConditions}, litNodeClient)
      return {ciphertext, dataToEncryptHash}
    }   else {
      throw new Error("encryptLearnerAddress returned undefined instead of ciphertext and dataToEncryptHash because pkpWallet is undefined at time of call")

    }

  }, [pkpWallet])
}
