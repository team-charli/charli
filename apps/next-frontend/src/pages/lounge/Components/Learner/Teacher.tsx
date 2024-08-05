//Teacher.tsx
import { useState } from "react";
import useLocalStorage from "@rehooks/local-storage";
import { usePreCalculateTimeDate } from "@/hooks/Lounge/usePreCalculateTimeDate";
import DateTimeLocalInput from "@/components/elements/DateTimeLocalInput";
import SessionLengthInput from "@/components/elements/SessionLengthInput";
import { useSignApproveFundController } from "@/hooks/Lounge/QueriesMutations/useSignApproveFundController";
import { useSignSessionDuration } from "@/hooks/Lounge/QueriesMutations/useSignSessionDuration";
import { useLearnerSubmitLearningRequest } from "@/hooks/Lounge/QueriesMutations/useLearnerSubmitLearningRequest";
import { useComputeControllerAddress } from "@/hooks/Lounge/QueriesMutations/useComputeControllerAddress";
import { BigNumberish } from "ethers";

interface TeacherProps {
  teacherName: string;
  teacherID: number;
  teachingLang: string;
}

const Teacher = ({ teacherName, teacherID, teachingLang}: TeacherProps) => {
  const [userID] = useLocalStorage("userID");
  const [sessionLengthInputValue, setSessionLengthInputValue] = useState<string>("");
  const [ toggleDateTimePicker, setToggleDateTimePicker ] = useState(false);
  const [ renderSubmitConfirmation, setRenderSubmitConfirmation ] = useState(false);
  const contractAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS;
  const { dateTime, setDateTime } = usePreCalculateTimeDate();
  const { controller_address } = useComputeControllerAddress();

  const sessionDuration = sessionLengthInputValue ? parseInt(sessionLengthInputValue) : 0;
  const amount: BigNumberish = sessionDuration * 0.3;

  const { data: requestedSessionDurationLearnerSig, isLoading: isSigningSessionDuration } = useSignSessionDuration(sessionDuration);
  const signApproveFundControllerMutation = useSignApproveFundController();
  const submitLearningRequestMutation = useLearnerSubmitLearningRequest();

  const handleSubmitLearningRequest = async () => {
    if (sessionDuration && userID && requestedSessionDurationLearnerSig) {
      // First, approve the fund controller
      await signApproveFundControllerMutation.mutateAsync({
        contractAddress,
        spenderAddress: controller_address,
        amount
      });

      // Then, submit the learning request
      submitLearningRequestMutation.mutate({
        dateTime,
        teacherID,
        userID,
        teachingLang,
        sessionDuration,
        requestedSessionDurationLearnerSig
      }, {
        onSuccess: () => {
          setRenderSubmitConfirmation(true);
        },
        onError: (error) => {
          console.error("Error submitting learning request:", error);
        }
      });
    }
  };

  return (
    <>
      <li onClick={() => !renderSubmitConfirmation && setToggleDateTimePicker(prevState => !prevState)} className="cursor-pointer">
        <u>{teacherName}</u>
      </li>
      {toggleDateTimePicker && !renderSubmitConfirmation && (
        <div className="__dateTimePicker space-x-2">
          <span>When?</span>
          <DateTimeLocalInput dateTime={dateTime} setDateTime={setDateTime} />
          <SessionLengthInput sessionLength={sessionLengthInputValue} setSessionLength={setSessionLengthInputValue} />
          <button
            onClick={() => void handleSubmitLearningRequest()}
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
