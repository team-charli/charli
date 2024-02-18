import { useState } from "react";
import DateTimeLocalInput from "apps/frontend/src/Components/Elements/DateTimeLocalInput";
import { usePreCalculateTimeDate } from "apps/frontend/src/hooks/Lounge/usePreCalculateTimeDate";
import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";
import useLocalStorage from "@rehooks/local-storage";

interface TeacherProps {
  teacherName: string;
  teacherID: number;
}

const Teacher = ({ teacherName, teacherID }: TeacherProps) => {
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const { dateTime, setDateTime } = usePreCalculateTimeDate();
  const {client: supabaseClient, supabaseLoading} = useSupabase()
  const [userID] = useLocalStorage("userID")
  const handleSubmit = async () => {
    if (supabaseClient && !supabaseLoading && userID) {
      const localDateTime = new Date(dateTime);
      const utcDateTime = localDateTime.toISOString();

      try {
        const { data, error } = await supabaseClient
          .from('sessions')
          .insert([
            { teacher_id: teacherID, learner_id: userID, request_time_date:utcDateTime, requestOrigin: "learner"},
          ])
          .select()
        if (!error) {
          console.log('Submission successful', data);
        } else {
          console.error('Submission failed');
        }
      } catch (error) {
        console.error('Error submitting data', error);
        // Handle network errors
      }
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <li onClick={() => setShowDateTimePicker(true)} className="cursor-pointer">
        <u>{teacherName}</u>
      </li>
      {showDateTimePicker && (
        <>
          <span>When?</span>
          <DateTimeLocalInput dateTime={dateTime} setDateTime={setDateTime} />
          <button onClick={handleSubmit} className="p-1 rounded">
            Submit
          </button>
        </>
      )}
    </div>
  );
};

export default Teacher;
