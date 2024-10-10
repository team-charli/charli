/* Not possible for Lit Action Claiming?? */


import { LitNodeClient } from '@lit-protocol/lit-node-client';
import {ethers} from 'ethers';

export const generateControllerData = (litNodeClient: LitNodeClient, ipfs_cid: string) => {

  const uniqueData = `ControllerPKP_${Date.now()}`;
  const bytes = ethers.toUtf8Bytes(uniqueData);
  const userId = ethers.keccak256(bytes);
  const keyId = litNodeClient.computeHDKeyId(userId, ipfs_cid, true);
  const publicKey = litNodeClient.computeHDPubKey(keyId);
  const claimKeyAddress = ethers.computeAddress("0x" + publicKey);
  return {
    controller_claim_user_id: userId,
    controller_address: claimKeyAddress,
    controller_public_key: publicKey,
    claim_key_id: keyId,
  };
}
