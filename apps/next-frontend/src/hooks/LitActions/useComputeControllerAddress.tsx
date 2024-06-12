import { ethers } from 'ethers';
import { generateUserId } from '../../utils/app';
import { litNodeClient } from '@/utils/litClients';
import { useEffect, useState } from 'react';

export const useComputeControllerAddress = () => {
  const [controllerData, setControllerData] = useState({
    controller_claim_user_id: '',
    controller_address: '',
    controller_public_key: '',
    claim_key_id: '',
  });

  useEffect(() => {
  }, [litNodeClient.ready])

  useEffect(() => {
    if (!litNodeClient.ready) {
      void (async () => {
        await litNodeClient.connect()
      })();
    } else {

      const ipfs_cid = process.env.NEXT_PUBLIC_LIT_ACTION_IPFS_CID_TRANSFER_FROM_LEARNER;
      if (!ipfs_cid) throw new Error('missing ipfs_cid env');

      const userId = generateUserId();
      const keyId = litNodeClient.computeHDKeyId(userId, ipfs_cid, true);
      const publicKey = litNodeClient.computeHDPubKey(keyId);
      const claimKeyAddress = ethers.computeAddress(publicKey);

      setControllerData({
        controller_claim_user_id: userId,
        controller_address: claimKeyAddress,
        controller_public_key: publicKey,
        claim_key_id: keyId,
      });
    }
  }, [litNodeClient.ready]);

  return controllerData;
};
