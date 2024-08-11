import { useState } from "react";
import { ReceivedTeachingRequestProps } from '@/types/types';
import { useLocalizeAndFormatDateTime } from '@/hooks/utils/useLocalizeAndFormatDateTime';
import DateTimeLocalInput from '@/components/elements/DateTimeLocalInput';
import { useHandleTeacherRequest } from '@/hooks/Lounge/useHandleTeacherRequest';
const ReceivedTeachingRequest = ({ notification }: ReceivedTeachingRequestProps) => {
  const [uiCondition, setUiCondition] = useState<'initial' | 'confirmed' | 'rejectOptions' | 'changingTime'>('initial');

  const { dateTime, setDateTime, localTimeAndDate: { displayLocalDate, displayLocalTime } } = useLocalizeAndFormatDateTime(notification.request_time_date);

  const {handleTeacherChoice, handleRejectResponse, handleSubmitChangeDateTime} = useHandleTeacherRequest(notification, dateTime, setUiCondition);


  return (
    <ul>
      {uiCondition === 'initial' && (
        <li>
          Confirm meeting with {notification.learnerName} at {displayLocalTime} {displayLocalDate} in {notification.teaching_lang}?
          <div>
            <button onClick={() => void handleTeacherChoice('accept')}>Accept</button>
            <button onClick={() => void handleTeacherChoice('reject')}>Reject</button>
            <button onClick={() => void handleTeacherChoice('reschedule')}>Reschedule</button>
          </div>
        </li>
      )}
      {uiCondition === 'confirmed' && <li>Request confirmed.</li>}
      {uiCondition === 'rejectOptions' && (
        <li>
          <div>
            <p>Reason for rejection:</p>
            <button onClick={() => void handleRejectResponse('no_time')}>No free time</button>
            <button onClick={() => void handleRejectResponse('no_interest')}>Not interested</button>
            <button onClick={() => void handleRejectResponse('other')}>Other reason</button>
          </div>
        </li>
      )}
      {uiCondition === 'changingTime' && (
        <li>
          <DateTimeLocalInput dateTime={dateTime} setDateTime={setDateTime} />
          <button onClick={() => void handleSubmitChangeDateTime()}>Submit New Time</button>
        </li>
      )}
    </ul>
  );
};

export default ReceivedTeachingRequest;
