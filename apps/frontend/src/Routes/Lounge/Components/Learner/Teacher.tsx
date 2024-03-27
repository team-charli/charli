import { useEffect, useState } from "react";
import DateTimeLocalInput from "apps/frontend/src/Components/Elements/DateTimeLocalInput";
import { usePreCalculateTimeDate } from "apps/frontend/src/hooks/Lounge/usePreCalculateTimeDate";
import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";
import useLocalStorage from "@rehooks/local-storage";
import { convertLocalTimetoUtc } from "apps/frontend/src/utils/app";
import { learnerSubmitLearningRequest } from "apps/frontend/src/Supabase/DbCalls/learnerSubmitLearningRequest";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import signApproveFundController from "apps/frontend/src/Lit/SignPKPEthers/signApproveFundController";
import SessionLengthInput from "apps/frontend/src/Components/Elements/SessionLengthInput";
import { useComputeControllerAddress } from "apps/frontend/src/hooks/LitActions/useComputeControllerAddress";
import { parseInt } from "lodash";

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
  const contractAddress = import.meta.env.USDC_CONTRACT_ADDRESS;
  const {controller_address, controller_claim_userId, claim_key_id}  =  useComputeControllerAddress();

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
      const learningRequestSuccess = await learnerSubmitLearningRequest(supabaseClient, dateTime, teacherID, userID, teachingLang, setRenderSubmitConfirmation, sessionLength, controller_address, claim_key_id )

      if (learningRequestSuccess && amount) {
        await signApproveFundController(sessionSigs, currentAccount, contractAddress, controller_address, amount )
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
