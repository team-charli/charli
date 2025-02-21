import { useLitAccount } from "@/contexts/AuthContext";
import { verifyRoleAndAddress } from "@/utils/app";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export const useVerifiyRoleAndAddress = (hashed_teacher_address: string | undefined, hashed_learner_address: string | undefined, roomRole: 'teacher' | 'learner') => {
  const { data: currentAccount } = useLitAccount();

  useEffect(() => {
  //console.log("verifyRoleAndAddress enabled props", {hashed_teacher_addressBool: !!hashed_teacher_address,  hashed_learner_addressBool: !!hashed_learner_address, roomRoleBool: !!roomRole,  currentAccountBool: !!currentAccount})
  }, [roomRole,currentAccount, hashed_teacher_address, hashed_learner_address])

  return useQuery({
    queryKey: ['verifyRoleAndAddress', hashed_teacher_address, hashed_learner_address, roomRole, currentAccount],
    queryFn: () => {
      if (hashed_teacher_address?.length && hashed_learner_address?.length && roomRole?.length && currentAccount) {
        const result = verifyRoleAndAddress(hashed_teacher_address, hashed_learner_address, roomRole, currentAccount);
        if (result.verifiedRole === 'teacher' || result.verifiedRole === 'learner') {
          //console.log('verifyRoleAndAddress query executed. Returning: ', { verifiedRole: result.verifiedRole, verifiedRoleAndAddress: true });
          return { verifiedRole: result.verifiedRole, verifiedRoleAndAddress: true };
        } else {
          throw new Error(`can't verify`);
        }
      } else {
        //console.log({hashed_teacher_address_length: hashed_teacher_address?.length, hashed_learner_address_length: hashed_learner_address?.length,  roomRole, currentAccount});
        return { verifiedRole: null, verifiedRoleAndAddress: false };
      }
    },
    enabled: !!hashed_teacher_address && !!hashed_learner_address && !!roomRole && !!currentAccount,
  });
};
