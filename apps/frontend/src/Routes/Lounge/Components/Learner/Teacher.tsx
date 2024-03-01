import { useState } from "react";
import DateTimeLocalInput from "apps/frontend/src/Components/Elements/DateTimeLocalInput";
import { usePreCalculateTimeDate } from "apps/frontend/src/hooks/Lounge/usePreCalculateTimeDate";
import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";
import useLocalStorage from "@rehooks/local-storage";
import { convertLocalTimetoUtc } from "apps/frontend/src/utils/app";

interface TeacherProps {
  teacherName: string;
  teacherID: number;
}

const Teacher = ({ teacherName, teacherID }: TeacherProps) => {
  const [toggleDateTimePicker, setToggleDateTimePicker] = useState(false);
  const [renderSubmitConfirmation, setRenderSubmitConfirmation] = useState(false);
  const { dateTime, setDateTime } = usePreCalculateTimeDate();
  const {client: supabaseClient, supabaseLoading} = useSupabase()
  const [userID] = useLocalStorage("userID")

  const handleSubmit = async () => {
    if (supabaseClient && !supabaseLoading && userID) {
      const utcDateTime = convertLocalTimetoUtc(dateTime)
      try {
        const { data, error } = await supabaseClient
          .from('sessions')
          .insert([
            { teacher_id: teacherID, learner_id: userID, request_time_date:utcDateTime, request_origin_type: "learner", request_origin: userID},
          ])
          .select()
        if (!error) {
          console.log('Submission successful', data);
          setRenderSubmitConfirmation(true);
        } else {
          console.error('Submission failed');
        }
      } catch (error) {
        console.error('Error submitting data', error);
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
