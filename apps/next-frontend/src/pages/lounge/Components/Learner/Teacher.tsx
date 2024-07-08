import { useEffect, useState } from "react";
import { parseInt } from "lodash";
import useLocalStorage from "@rehooks/local-storage";
import { usePreCalculateTimeDate } from "@/hooks/Lounge/usePreCalculateTimeDate";
import { useComputeControllerAddress } from "@/hooks/LitActions/useComputeControllerAddress";
import DateTimeLocalInput from "@/components/elements/DateTimeLocalInput";
import SessionLengthInput from "@/components/elements/SessionLengthInput";
import { useSignApproveFundController } from "@/hooks/Lounge/QueriesMutations/useSignApproveFundController";
import { useSignSessionDuration } from "@/hooks/Lounge/QueriesMutations/useSignSessionDuration";
import { useQueryClient } from "@tanstack/react-query";
import { useLearnerSubmitLearningRequest } from "@/hooks/Lounge/QueriesMutations/useLearnerSubmitLearningRequest";
import { BigNumberish } from "ethers";

interface TeacherProps {
  teacherName: string;
  teacherID: number;
  teachingLang: string;
}

const Teacher = ({ teacherName, teacherID, teachingLang}: TeacherProps) => {
  const [sessionLengthInputValue, setSessionLengthInputValue] = useState<string | undefined>(undefined);
  const [sessionDuration, setSessionDuration] = useState<number | null>(null);
  const [amount, setAmount] = useState<BigNumberish|null>(null);
  const [ toggleDateTimePicker, setToggleDateTimePicker ] = useState(false);
  const [ renderSubmitConfirmation, setRenderSubmitConfirmation ] = useState(false);
  const contractAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS;
  useEffect(() => {
    if (sessionLengthInputValue?.length) {
      const minutes = parseInt(sessionLengthInputValue)
      setSessionDuration(minutes);
      const rate = .3
      setAmount(minutes * rate);
    }
  }, [sessionLengthInputValue])
  const { dateTime, setDateTime } = usePreCalculateTimeDate();
  const [userID] = useLocalStorage("userID")
  const {controller_address} = useComputeControllerAddress();
  const queryClient = useQueryClient();
  const { data: requestedSessionDurationLearnerSig, isLoading: isSigningSessionDuration } = useSignSessionDuration(sessionDuration ?? 0);
  const { data: learningRequestSuccess, isLoading: isSubmittingLearningRequest, refetch: submitLearningRequest } = useLearnerSubmitLearningRequest(
    dateTime,
    teacherID,
    userID,
    teachingLang,
    sessionDuration,
    requestedSessionDurationLearnerSig
  );

  const { data: signedApprovalTx, isLoading: isApprovingFunds, refetch: signApproveFundController } = useSignApproveFundController(
    contractAddress,
    controller_address,
    amount
  );
  const handleSubmitLearningRequest = async () => {
    if (sessionDuration && userID && requestedSessionDurationLearnerSig) {
      try {
        await queryClient.fetchQuery({
          queryKey: ['learnerSubmitLearningRequest', dateTime, teacherID, userID, teachingLang, sessionDuration, requestedSessionDurationLearnerSig],
          queryFn: () => useLearnerSubmitLearningRequest(dateTime, teacherID, userID, teachingLang, sessionDuration, requestedSessionDurationLearnerSig)
        });

        setRenderSubmitConfirmation(true);

        if (amount && contractAddress) {
          await queryClient.fetchQuery({
            queryKey: ['signApproveFundController', contractAddress, controller_address, amount],
            queryFn: () => useSignApproveFundController(contractAddress, controller_address, amount)
          });
        }
      } catch (error) {
        console.error("Error submitting learning request:", error);
      }
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
          <DateTimeLocalInput  dateTime={dateTime} setDateTime={setDateTime}  />
          <SessionLengthInput sessionLength={sessionLengthInputValue} setSessionLength={setSessionLengthInputValue} />
          <button onClick={() => void handleSubmitLearningRequest()} className="p-1 rounded">
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
