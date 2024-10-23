import { useLitAccount } from "@/contexts/AuthContext";
import { verifyRoleAndAddress } from "@/utils/app";
import { useQuery } from "@tanstack/react-query";

export const useVerifiyRoleAndAddress = (hashed_teacher_address: string | undefined, hashed_learner_address: string | undefined, roomRole: 'teacher' | 'learner') => {
  const { data: currentAccount } = useLitAccount();

  return useQuery({
    queryKey: ['verifyRoleAndAddress', hashed_teacher_address, hashed_learner_address, roomRole, currentAccount],
    queryFn: () => {
      console.log('verifyRoleAndAddress query attempted');
      if (hashed_teacher_address?.length && hashed_learner_address?.length && roomRole?.length && currentAccount) {
        const result = verifyRoleAndAddress(hashed_teacher_address, hashed_learner_address, roomRole, currentAccount);
        if (result.verifiedRole === 'teacher' || result.verifiedRole === 'learner') {
          console.log('verifyRoleAndAddress query executed');
          return { verifiedRole: result.verifiedRole, verifiedRoleAndAddress: true };
        } else {
          throw new Error(`can't verify`);
        }
      } else {
        console.log({hashed_teacher_address_length: hashed_teacher_address?.length, hashed_learner_address_length: hashed_learner_address?.length,  roomRole, currentAccount});
        return { verifiedRole: null, verifiedRoleAndAddress: false };
      }
    },
    enabled: !!hashed_teacher_address && !!hashed_learner_address && !!roomRole && !!currentAccount,
  });
};
