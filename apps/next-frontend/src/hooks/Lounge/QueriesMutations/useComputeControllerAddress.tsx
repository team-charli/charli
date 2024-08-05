//useComputeControllerAddress.tsx
import { ethers } from 'ethers';
import { litNodeClient } from '@/utils/litClients';
import { useState, useEffect } from 'react';
import { generateUserId } from '@/utils/app';

export const useComputeControllerAddress = () => {
  const [controllerData, setControllerData] = useState({
    controller_claim_user_id: '',
    controller_address: '',
    controller_public_key: '',
    claim_key_id: '',
  });

  useEffect(() => {
    const ipfs_cid = process.env.NEXT_PUBLIC_LIT_ACTION_IPFS_CID_TRANSFER_FROM_LEARNER;
    if (!ipfs_cid) throw new Error('missing ipfs_cid env');

    const userId = generateUserId();
    const keyId = litNodeClient.computeHDKeyId(userId, ipfs_cid, true);
    const publicKey = litNodeClient.computeHDPubKey(keyId);
    console.log('publicKey', publicKey)
    const claimKeyAddress = ethers.computeAddress("0x" + publicKey);

    setControllerData({
      controller_claim_user_id: userId,
      controller_address: claimKeyAddress,
      controller_public_key: publicKey,
      claim_key_id: keyId,
    });
  }, []); // Empty dependency array means this effect runs once on mount

  return controllerData;
};
