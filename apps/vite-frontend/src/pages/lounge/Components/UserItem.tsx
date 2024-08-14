// UserItem.tsx
import { useCallback } from "react";
import useLocalStorage from "@rehooks/local-storage";
import DateTimeLocalInput from "@/components/elements/DateTimeLocalInput";
import SessionLengthInput from "@/components/elements/SessionLengthInput";
import { useSignApproveFundController } from "@/hooks/Lounge/QueriesMutations/useSignApproveFundController";
import { useSignSessionDuration } from "@/hooks/Lounge/QueriesMutations/useSignSessionDuration";
import { useLearnerSubmitLearningRequest } from "@/hooks/Lounge/QueriesMutations/useLearnerSubmitLearningRequest";
import { useComputeControllerAddress } from "@/hooks/Lounge/QueriesMutations/useComputeControllerAddress";
import { useLearningRequestState } from "@/hooks/Lounge/useLearningRequestState";

const contractAddress = import.meta.env.VITE_USDC_SEPOLIA_CONTRACT_ADDRESS;

interface UserItemProps {
  userName: string;
  userID: number;
  lang: string;
  modeView: "Learn" | "Teach";
}

const UserItem = ({ userName, userID, lang, modeView }: UserItemProps) => {
  const [loggedInUserId] = useLocalStorage<number>("userID");
  // Only initialize these hooks if modeView is "Learn"
  const learningRequestState = modeView === "Learn" ? useLearningRequestState() : null;
  const { controller_address } = modeView === "Learn" ? useComputeControllerAddress() : { controller_address: null };
  const { mutateAsync: signSessionDuration, isPending: isSigningSessionDuration } = modeView === "Learn" ? useSignSessionDuration() : { mutateAsync: null, isPending: false };
  const signApproveFundControllerMutation = modeView === "Learn" ? useSignApproveFundController() : null;
  const submitLearningRequestMutation = modeView === "Learn" ? useLearnerSubmitLearningRequest() : null;

  const handleSubmitLearningRequest = useCallback(async () => {
    if (modeView !== "Learn" || !learningRequestState) return;

    const { sessionDuration, dateTime, amount } = learningRequestState;

    if (sessionDuration && loggedInUserId) {
      try {
        const learnerSignedSessionDuration = await signSessionDuration!(sessionDuration);
        await signApproveFundControllerMutation!.mutateAsync({
          contractAddress,
          spenderAddress: controller_address!,
          amount
        });
        submitLearningRequestMutation!.mutate({
          dateTime,
          teacherID: userID,
          userID: loggedInUserId,
          teachingLang: lang,
          sessionDuration,
          learnerSignedSessionDuration
        }, {
          onSuccess: () => learningRequestState.setRenderSubmitConfirmation(true),
          onError: (error) => console.error("Error submitting learning request:", error),
        });
      } catch (error) {
        console.error("Error in submit process:", error);
      }
    }
  }, [modeView, learningRequestState, signSessionDuration, signApproveFundControllerMutation, submitLearningRequestMutation, loggedInUserId, userID, lang, controller_address]);

  if (modeView === "Teach") {
    return <li key={userID}>{userName}</li>;
  }

  return (
    <>
      <li onClick={() => !learningRequestState!.renderSubmitConfirmation && learningRequestState!.setToggleDateTimePicker(prev => !prev)} className="cursor-pointer">
        <u>{userName}</u>
      </li>
      {learningRequestState!.toggleDateTimePicker && !learningRequestState!.renderSubmitConfirmation && (
        <div className="__dateTimePicker space-x-2">
          <span>When?</span>
          <DateTimeLocalInput dateTime={learningRequestState!.dateTime} setDateTime={learningRequestState!.setDateTime} />
          <SessionLengthInput sessionLength={learningRequestState!.sessionLengthInputValue} setSessionLength={learningRequestState!.setSessionLengthInputValue} />
          <button
            onClick={handleSubmitLearningRequest}
            className="p-1 rounded"
            disabled={isSigningSessionDuration || signApproveFundControllerMutation!.isPending || submitLearningRequestMutation!.isPending}
          >
            Submit
          </button>
        </div>
      )}
      {learningRequestState!.renderSubmitConfirmation && (
        <div className="submissionConfirmation">
          Session Request Submitted
        </div>
      )}
    </>
  );
};

export default UserItem;
