import ky from 'ky'
import { ethers } from 'ethers';
import { litNodeClient } from '../../utils/lit';
import { generateUserId } from '../../utils/app';

export const useComputeControllerAddress = () => {
  const ipfs_cid = import.meta.env.VITE_LIT_ACTION_IPFS_CID_TRANSFER_FROM_LEARNER;
  const userId = generateUserId();

  const keyId = litNodeClient.computeHDKeyId(userId, ipfs_cid, true);
  const publicKey = litNodeClient.computeHDPubKey(keyId);

  const claimKeyAddress = ethers.computeAddress(publicKey);

  return { controller_claim_userId: userId, controller_address: claimKeyAddress, controller_public_key: publicKey, claim_key_id: keyId  };
};


