import { IRelayPKP } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import ethers from 'ethers';

export const useVerifyRoleAndAddress = ( ) => {
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');

  function verifyRoleAndAddress(hashed_teacher_address:string | undefined, hashed_learner_address: string | undefined, roomRole: "learner" | "teacher") {
    if (roomRole === 'teacher' && currentAccount?.ethAddress && hashed_teacher_address === ethers.keccak256(currentAccount?.ethAddress) ) {
      return true;
    } else if (roomRole === 'learner' && currentAccount?.ethAddress && hashed_learner_address === ethers.keccak256(currentAccount.ethAddress)) {
      return true
    } else {throw new Error("you're busted")}
  }
  return { verifyRoleAndAddress };
}
