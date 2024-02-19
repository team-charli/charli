import { useState } from "react";
import DateTimeLocalInput from "apps/frontend/src/Components/Elements/DateTimeLocalInput";
import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";
import { useLocalizeAndFormatDateTime } from "apps/frontend/src/hooks/utils/useLocalizeAndFormatDateTime";

interface ScheduleItemProps {
  learnerName: string;
  utcReqTimeDate: string;
}

const ScheduleItem = ({ learnerName, utcReqTimeDate }: ScheduleItemProps) => {
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const [uiMode, setUiMode] = useState('initial'); // 'initial', 'confirmed', 'noOptions', 'changingTime'
  const {dateTime, setDateTime, localTimeAndDate: {displayLocalDate, displayLocalTime}} = useLocalizeAndFormatDateTime(utcReqTimeDate)


  const handleYesNoChange = async (action: string) => {
    //** User Confirms Request **//
    if (action === 'yes' && supabaseClient && !supabaseLoading) {
      try {
        const dateObj = new Date(dateTime)
        const utcDateTime = dateObj.toISOString();
        const { data, error } = await supabaseClient
          .from('sessions')
          .update({'confirmed_time_date': utcDateTime })
          .select();
        if (!error) {
          setUiMode('confirmed');
        } else {
          console.error('Submission failed');
        }
      } catch (error) {
        console.error('Error submitting data', error);
      }
    }
//** User Rejects Request: Show Reason Dialog **//
    else if (action === 'no') {
      setUiMode('noOptions');
    }
//** User Requests Time Change: Show Time Change Dialog **//
    else if (action === 'change-time') {
      setUiMode('changingTime');
    }
  }

  const handleNoOptionsResponse = async (reason: string) => {
    if (supabaseClient && !supabaseLoading) {
      try {
        const {data, error} = await supabaseClient
          .from('sessions')
          .update({session_rejected_reason: reason})
          .select();
        if (!error) {
          console.log('Submission successful', data);
        } else {
          console.error('Submission failed');
        }
      } catch (error) {
        console.error('Error submitting data', error);
      }
    }
  };

  const handleSubmitChangeDateTime = async () => {
    if (supabaseClient && !supabaseLoading) {
      const dateObj = new Date(dateTime)
      const utcDateTime = dateObj.toISOString();

      try {
        const {data, error} = await supabaseClient
          .from('sessions')
          .update({ counter_time_date: utcDateTime })
          .select();
        if (!error) {
          console.log('Submission successful', data);
        } else {
          console.error('Submission failed');
        }
      } catch (error) {
        console.error('Error submitting data', error);
      }
    }
  }

  return (
    <li className="flex flex-col items-center space-x-2">
      {uiMode === 'initial' && (
        <>
          <p>Confirm meeting with {learnerName} at {displayLocalTime} {displayLocalDate}?</p>
          <div>
            <button onClick={() => handleYesNoChange('yes')} className="rounded px-2 py-1">Yes</button>
            <button onClick={() => handleYesNoChange('no')} className="rounded px-2 py-1">No</button>
            <button onClick={() => handleYesNoChange('change')} className="rounded px-2 py-1">Change Time</button>
          </div>
        </>
      )}
      {uiMode === 'confirmed' && <p>Request sent</p>}
      {uiMode === 'noOptions' && (
        <div>
          <button onClick={() => handleNoOptionsResponse('no_time')} className="rounded px-2 py-1">No free time</button>
          <button onClick={() => handleNoOptionsResponse('no_interest')} className="rounded px-2 py-1">I'm not interested</button>
          <button onClick={() => handleNoOptionsResponse('other')} className="rounded px-2 py-1">Other</button>

        </div>
      )}
      {uiMode === 'changingTime' && (
        <div>
          <DateTimeLocalInput dateTime={dateTime} setDateTime={setDateTime} />
          <button onClick={() => handleSubmitChangeDateTime()} className="rounded px-2 py-1">Submit</button>
        </div>
      )}
    </li>
  );
};

export default ScheduleItem;
