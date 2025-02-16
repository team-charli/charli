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
  console.log('rendered SentLearningRequest notification text', `${notification.teacherName} for ${languageDisplay} ${countryEmoji} at ${localTimeAndDate.displayLocalDate}, ${localTimeAndDate.displayLocalTime}`)

  return (
    <div className="grid grid-cols-3">
      <div className="col-start-2 col-span-2">
        <ul>
          <li className="flex items-center gap-2 bg-green-300 w-1/2 border-2 border-neutral-700">
            <span className="mr-4">
              {`Sent request to `}
              <span className="italic">{notification.teacherName}</span>
              {` for ${languageDisplay} ${countryEmoji} at ${localTimeAndDate.displayLocalDate}, ${localTimeAndDate.displayLocalTime}`}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SentLearningRequest;
