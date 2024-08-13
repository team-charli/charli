import { useCallback } from "react";
import useLocalStorage from "@rehooks/local-storage";
import DateTimeLocalInput from "@/components/elements/DateTimeLocalInput";
import SessionLengthInput from "@/components/elements/SessionLengthInput";
import { useSignApproveFundController } from "@/hooks/Lounge/QueriesMutations/useSignApproveFundController";
import { useSignSessionDuration } from "@/hooks/Lounge/QueriesMutations/useSignSessionDuration";
import { useLearnerSubmitLearningRequest } from "@/hooks/Lounge/QueriesMutations/useLearnerSubmitLearningRequest";
import { useComputeControllerAddress } from "@/hooks/Lounge/QueriesMutations/useComputeControllerAddress";
const contractAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS;
import { mutationLogger } from "@/App";
import { useLearningRequestState } from "@/hooks/Lounge/useLearningRequestState";

interface TeacherProps {
  teacherName: string;
  teacherID: number;
  teachingLang: string;
}

const Teacher = ({ teacherName, teacherID, teachingLang}: TeacherProps) => {
  const [userID] = useLocalStorage("userID");

  const {sessionLengthInputValue, setSessionLengthInputValue, toggleDateTimePicker, setToggleDateTimePicker, renderSubmitConfirmation, setRenderSubmitConfirmation,  dateTime, setDateTime, sessionDuration, amount } = useLearningRequestState();


  const { controller_address } = useComputeControllerAddress();

  const { signSessionDuration, isLoading: isSigningSessionDuration, error: sessionDurationSignError } = useSignSessionDuration();
  const signApproveFundControllerMutation = useSignApproveFundController();
  const submitLearningRequestMutation = useLearnerSubmitLearningRequest();

  const handleSubmitLearningRequest = useCallback(async () => {
    if (sessionDuration && userID) {
      try {
        mutationLogger.info("called submit")
        const learnerSignedSessionDuration = await signSessionDuration(sessionDuration);

        await signApproveFundControllerMutation.mutateAsync({
          contractAddress,
          spenderAddress: controller_address,
          amount
        });

        submitLearningRequestMutation.mutate({
          dateTime,
          teacherID,
          userID,
          teachingLang,
          sessionDuration,
          learnerSignedSessionDuration
        }, {
            onSuccess: () => setRenderSubmitConfirmation(true),
            onError: (error) => console.error("Error submitting learning request:", error),
          });
      } catch (error) {
        console.error("Error in submit process:", error);
      }
    }
  }, [sessionDuration, userID, signSessionDuration, signApproveFundControllerMutation, submitLearningRequestMutation, contractAddress, controller_address, amount, dateTime, teacherID, teachingLang]);

  return (
    <>
      <li onClick={() => !renderSubmitConfirmation && setToggleDateTimePicker(prev => !prev)} className="cursor-pointer">
        <u>{teacherName}</u>
      </li>
      {toggleDateTimePicker && !renderSubmitConfirmation && (
        <div className="__dateTimePicker space-x-2">
          <span>When?</span>
          <DateTimeLocalInput dateTime={dateTime} setDateTime={setDateTime} />
          <SessionLengthInput sessionLength={sessionLengthInputValue} setSessionLength={setSessionLengthInputValue} />
          <button
            onClick={handleSubmitLearningRequest}
            className="p-1 rounded"
            disabled={isSigningSessionDuration || signApproveFundControllerMutation.isPending || submitLearningRequestMutation.isPending}
          >
            Submit
          </button>
        </div>
      )}
      {renderSubmitConfirmation && (
        <div className="submissionConfirmation">
          Session Request Submitted
        </div>
      )}
    </>
  );
};

export default Teacher;
