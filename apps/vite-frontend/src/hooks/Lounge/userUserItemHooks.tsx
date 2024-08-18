import { useComputeControllerAddress } from "./QueriesMutations/useComputeControllerAddress";
import { useLearnerSubmitLearningRequest } from "./QueriesMutations/useLearnerSubmitLearningRequest";
import { useSignApproveFundController } from "./QueriesMutations/useSignApproveFundController";
import { useSignSessionDuration } from "./QueriesMutations/useSignSessionDuration";
import { useLearningRequestState } from "./useLearningRequestState";

export const userUserItemHooks = (isLearnMode: boolean, userID: number, lang: string, loggedInUserId: number | null) => {
  if (!isLearnMode) return null;
  if (!isLearnMode) return null;

  const learningRequestState = useLearningRequestState();
  const { controller_address } = useComputeControllerAddress();
  const { mutateAsync: signSessionDuration, isPending: isSigningSessionDuration } = useSignSessionDuration();
  const signApproveFundControllerMutation = useSignApproveFundController();
  const submitLearningRequestMutation = useLearnerSubmitLearningRequest();

  return {
    learningRequestState,
    controller_address,
    signSessionDuration,
    isSigningSessionDuration,
    signApproveFundControllerMutation,
    submitLearningRequestMutation
  };
}
