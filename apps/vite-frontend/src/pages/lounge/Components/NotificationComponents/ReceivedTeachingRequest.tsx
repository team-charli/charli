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
    <div className="w-full">
      <div className="flex flex-col">
        <div className="mb-2 text-sm sm:text-base text-gray-600">
          <span className="font-medium">Teaching Request</span> from {notification.learnerName}
        </div>
        
        {uiCondition === 'initial' && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 sm:p-4">
            <div className="flex items-center gap-2 text-orange-800 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">New Teaching Request</span>
            </div>
            
            <div className="text-sm sm:text-base mb-3 sm:mb-4">
              <p><span className="font-medium">{notification.learnerName}</span> wants to learn {languageDisplay} {countryEmoji} with you.</p>
              <p className="mt-1">
                <span className="text-gray-600">Requested Time:</span> <span className="font-medium">{displayLocalDate} at {displayLocalTime}</span>
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button 
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-sm sm:text-base transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                onClick={async () => {
                  try {
                    await handleTeacherChoice('accept');
                    console.log('Accept flow finished with no errors');
                  } catch (err) {
                    console.error('Accept flow ended in error:', err);
                  }
                }}
              >
                Accept
              </button>

              <button 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-sm sm:text-base transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
                onClick={() => handleTeacherChoice('reject')}
              >
                Reject
              </button>

              <button 
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-sm sm:text-base transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                onClick={() => handleTeacherChoice('reschedule')}
              >
                Propose New Time
              </button>
            </div>
          </div>
        )}
        
        {uiCondition === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 sm:p-4">
            <div className="flex items-center gap-2 text-green-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Request Confirmed</span>
            </div>
          </div>
        )}
        
        {uiCondition === 'rejectOptions' && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 sm:p-4">
            <div className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              Reason for rejection:
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm transition-colors shadow-sm"
                onClick={() => void handleRejectResponse('no_time')}
              >
                No free time
              </button>
              <button 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm transition-colors shadow-sm"
                onClick={() => void handleRejectResponse('no_interest')}
              >
                Not interested
              </button>
              <button 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm transition-colors shadow-sm"
                onClick={() => void handleRejectResponse('other')}
              >
                Other reason
              </button>
            </div>
          </div>
        )}
        
        {uiCondition === 'changingTime' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 sm:p-4">
            <div className="text-sm sm:text-base font-medium text-blue-800 mb-2">
              Propose a new time:
            </div>
            <div className="space-y-3">
              <DateTimeLocalInput dateTime={dateTime} setDateTime={setDateTime} />
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-sm sm:text-base transition-colors shadow-sm mt-2"
                onClick={() => void handleSubmitChangeDateTime()}
              >
                Submit New Time
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceivedTeachingRequest;
