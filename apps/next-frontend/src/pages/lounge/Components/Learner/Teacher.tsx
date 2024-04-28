import { useEffect, useState } from "react";
import { parseInt } from "lodash";
import useLocalStorage from "@rehooks/local-storage";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import signApproveFundController from "@/Lit/SignPKPEthers/signApproveFundController";
import { learnerSubmitLearningRequest } from "@/Supabase/DbCalls/learnerSubmitLearningRequest";
import { useSupabase } from "@/contexts";
import { usePreCalculateTimeDate } from "@/hooks/Lounge/usePreCalculateTimeDate";
import { useComputeControllerAddress } from "@/hooks/LitActions/useComputeControllerAddress";
import DateTimeLocalInput from "@/components/elements/DateTimeLocalInput";
import SessionLengthInput from "@/components/elements/SessionLengthInput";

interface TeacherProps {
  teacherName: string;
  teacherID: number;
  teachingLang: string;
}

const Teacher = ({ teacherName, teacherID, teachingLang}: TeacherProps) => {
  const [sessionLengthInputValue, setSessionLengthInputValue] = useState<string | undefined>(undefined);
  const [sessionLength, setSessionLength] = useState<number | null>(null);
  const [amount, setAmount] = useState<number|null>(null);
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount')
  const [ toggleDateTimePicker, setToggleDateTimePicker ] = useState(false);
  const [ renderSubmitConfirmation, setRenderSubmitConfirmation ] = useState(false);
  const contractAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS;
  const {controller_address, controller_claim_user_id, claim_key_id, controller_public_key} = useComputeControllerAddress();

  useEffect(() => {
    if (sessionLengthInputValue?.length) {
      const minutes = parseInt(sessionLengthInputValue)
      setSessionLength(minutes);
      const rate = .3
      setAmount(minutes * rate);
    }
  }, [sessionLengthInputValue])
  const { dateTime, setDateTime } = usePreCalculateTimeDate();
  const { client: supabaseClient, supabaseLoading } = useSupabase()
  const [userID] = useLocalStorage("userID")

  const handleSubmitLearningRequest = async () => {
    if (supabaseClient && !supabaseLoading && userID && sessionLength) {
      const learningRequestSuccess = await learnerSubmitLearningRequest(supabaseClient, dateTime, teacherID, userID, teachingLang, setRenderSubmitConfirmation, sessionLength, controller_address, claim_key_id, controller_claim_user_id, controller_public_key, currentAccount)

      if (learningRequestSuccess && amount && contractAddress) {
        await signApproveFundController(sessionSigs, currentAccount, contractAddress, controller_address, amount )
      } else {
        console.log("one of these is undefined", {learningRequestSuccess, amount, contractAddress})
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
          <button onClick={handleSubmitLearningRequest} className="p-1 rounded">
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
