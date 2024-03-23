import { useState } from "react";
import DateTimeLocalInput from "apps/frontend/src/Components/Elements/DateTimeLocalInput";
import { usePreCalculateTimeDate } from "apps/frontend/src/hooks/Lounge/usePreCalculateTimeDate";
import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";
import useLocalStorage from "@rehooks/local-storage";
import { convertLocalTimetoUtc } from "apps/frontend/src/utils/app";
import { learnerSubmitLearningRequest } from "apps/frontend/src/Supabase/DbCalls/LearnerSubmitLearningRequest";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import signApproveFundController from "apps/frontend/src/Lit/SignPKPEthers/signApproveFundController";

interface TeacherProps {
  teacherName: string;
  teacherID: number;
  teachingLang: string;
}

const Teacher = ({ teacherName, teacherID, teachingLang}: TeacherProps) => {
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs')
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount')
  const [toggleDateTimePicker, setToggleDateTimePicker] = useState(false);
  const [renderSubmitConfirmation, setRenderSubmitConfirmation] = useState(false);
  const contractAddress = import.meta.env.USDC_CONTRACT_ADDRESS;
  const controllerPKP = '0x'; //TODO: store unique controller pkp per session
  const duration = 0; //TODO: calc
  const amount = .30 * duration;
  const spenderAddress = controllerPKP;
  const { dateTime, setDateTime } = usePreCalculateTimeDate();
  const {client: supabaseClient, supabaseLoading} = useSupabase()
  const [userID] = useLocalStorage("userID")

  const handleSubmit = async () => {
    if (supabaseClient && !supabaseLoading && userID) {
      const learningRequestSuccess = await learnerSubmitLearningRequest(supabaseClient, dateTime, teacherID, userID, teachingLang, setRenderSubmitConfirmation)
      if (learningRequestSuccess) {
        await signApproveFundController(sessionSigs,currentAccount,contractAddress,spenderAddress, amount)
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
          <button onClick={handleSubmit} className="p-1 rounded">
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
