import { ethers } from 'ethers';
import { generateUserId } from '../../utils/app';
import { litNodeClient } from '@/utils/litClients';

export const useComputeControllerAddress = () => {
  const ipfs_cid = process.env.NEXT_PUBLIC_LIT_ACTION_IPFS_CID_TRANSFER_FROM_LEARNER;
  if (!ipfs_cid) throw new Error('missing ipfs_cid env')
  const userId = generateUserId();

  const keyId = litNodeClient.computeHDKeyId(userId, ipfs_cid, true);
  const publicKey = litNodeClient.computeHDPubKey(keyId);

  const claimKeyAddress = ethers.computeAddress(publicKey);

  return { controller_claim_user_id: userId, controller_address: claimKeyAddress, controller_public_key: publicKey, claim_key_id: keyId  };
};


