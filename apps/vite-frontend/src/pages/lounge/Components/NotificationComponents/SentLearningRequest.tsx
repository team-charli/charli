//SentLearningRequest.tsx
import { NotificationIface } from "@/types/types";
import { useLocalizeAndFormatDateTime } from '@/utils/hooks/utils/useLocalizeAndFormatDateTime';
import { getCountryEmoji, cleanLangString } from '@/utils/app';

interface NotificationComponentProps {
  notification: NotificationIface;
}

const SentLearningRequest = ({ notification }: NotificationComponentProps) => {
  const { localTimeAndDate } = useLocalizeAndFormatDateTime(notification.request_time_date);

  const countryEmoji = getCountryEmoji(notification.teaching_lang);
  const languageDisplay = cleanLangString(notification.teaching_lang);

  return (
    <div className="w-full">
      <div className="flex flex-col">
        <div className="mb-2 text-sm sm:text-base text-gray-600">
          <span className="font-medium">Learning Request</span> to {notification.teacherName}
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 sm:p-4">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Pending Request</span>
          </div>
          
          <div className="text-sm sm:text-base flex flex-col">
            <div>
              <span className="text-gray-600">Teacher:</span> <span className="font-medium">{notification.teacherName}</span>
            </div>
            <div>
              <span className="text-gray-600">Time:</span> <span className="font-medium">{localTimeAndDate.displayLocalDate} at {localTimeAndDate.displayLocalTime}</span>
            </div>
            <div>
              <span className="text-gray-600">Language:</span> <span className="font-medium">{languageDisplay}</span> {countryEmoji}
            </div>
            <div className="mt-3 text-xs sm:text-sm text-gray-500">
              Waiting for {notification.teacherName} to accept your request.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentLearningRequest;
