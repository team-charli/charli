import { verifyRoleAndAddress } from "@/utils/app";
import { IRelayPKP } from "@lit-protocol/types";
import { useEffect, useState } from "react";

export const useVerifiyRoleAndAddress = (hashed_teacher_address: string | undefined, hashed_learner_address: string | undefined, roomRole: 'teacher' | 'learner', currentAccount:IRelayPKP | null) => {
  const [verifiedRoleAndAddress, setVerifiedRoleAndAddress] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState<'teacher'| 'learner' | null>(null)

  useEffect(() => {
    if (hashed_teacher_address?.length && hashed_learner_address?.length && roomRole?.length && currentAccount) {
    const result = verifyRoleAndAddress(hashed_teacher_address, hashed_learner_address, roomRole, currentAccount)
    if (result.verifiedRole === 'teacher') {
      setVerifiedRole('teacher')
      setVerifiedRoleAndAddress(true);
    } else if (result.verifiedRole === 'learner') {
      setVerifiedRole('learner');
      setVerifiedRoleAndAddress(true);
    } else {
      throw new Error(`can't verifiy`)
    }
    }
  }, [currentAccount, hashed_learner_address, hashed_teacher_address, roomRole])
  return {verifiedRole, verifiedRoleAndAddress}
}


