//ReceivedTeachingRequest.tsx
import { useState } from "react";
import { ReceivedTeachingRequestProps } from '@/types/types';
import DateTimeLocalInput from '@/components/elements/DateTimeLocalInput';
import { useLocalizeAndFormatDateTime } from "@/utils/hooks/utils/useLocalizeAndFormatDateTime";
import { useHandleTeacherRequest } from "../../hooks/useHandleTeacherRequest";
import { cleanLangString, getCountryEmoji } from "@/utils/app";

const ReceivedTeachingRequest = ({ notification }: ReceivedTeachingRequestProps) => {
  const countryEmoji = getCountryEmoji(notification.teaching_lang);
  const languageDisplay = cleanLangString(notification.teaching_lang);

  const [uiCondition, setUiCondition] = useState<'initial' | 'confirmed' | 'rejectOptions' | 'changingTime'>('initial');

  const { dateTime, setDateTime, localTimeAndDate: { displayLocalDate, displayLocalTime } } = useLocalizeAndFormatDateTime(notification.request_time_date);

  const {handleTeacherChoice, handleRejectResponse, handleSubmitChangeDateTime} = useHandleTeacherRequest(notification, notification.request_time_date, setUiCondition);

  return (
    <div className="grid grid-cols-3">
      <div className="col-start-2 col-span-2">
        <ul>
          {uiCondition === 'initial' && (
            <li className="flex items-center gap-2 bg-red-300 w-1/2 border-2 border-neutral-700">
              Confirm meeting with {notification.learnerName} at {displayLocalTime} {displayLocalDate} in ${languageDisplay} ${countryEmoji}?
              <div>
<button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded transition duration-300 ease-in-out mr-2" onClick={() => void handleTeacherChoice('accept')}>Accept</button>
<button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded transition duration-300 ease-in-out mr-2" onClick={() => void handleTeacherChoice('reject')}>Reject</button>
<button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded transition duration-300 ease-in-out" onClick={() => void handleTeacherChoice('reschedule')}>Reschedule</button>
              </div>
            </li>
          )}
          {uiCondition === 'confirmed' && <li>Request confirmed.</li>}
          {uiCondition === 'rejectOptions' && (
            <li className="flex items-center gap-2  w-1/2 border-2 border-neutral-700">
              <div>
                <p>Reason for rejection:</p>
                <button onClick={() => void handleRejectResponse('no_time')}>No free time</button>
                <button onClick={() => void handleRejectResponse('no_interest')}>Not interested</button>
                <button onClick={() => void handleRejectResponse('other')}>Other reason</button>
              </div>
            </li>
          )}
          {uiCondition === 'changingTime' && (
            <li className="flex items-center gap-2  w-1/2 border-2 border-neutral-700">
              <DateTimeLocalInput dateTime={dateTime} setDateTime={setDateTime} />
              <button onClick={() => void handleSubmitChangeDateTime()}>Submit New Time</button>
            </li>
          )}
        </ul>
      </div>
    </div>

  );
};

export default ReceivedTeachingRequest;
