import { useGenerateHuddleAccessToken } from '@/hooks/Lounge/useGenerateHuddleAccessToken';
import { useLocalizeAndFormatDateTime } from '@/hooks/utils/useLocalizeAndFormatDateTime';
import { ConfirmedLearningRequestProps } from '@/types/types';
import { formatUtcTimestampToLocalStrings } from '@/utils/app';
import Link from 'next/link';


const ConfirmedLearningRequest = ({ notification }: ConfirmedLearningRequestProps) => {
  const { formattedDate, formattedTime } = formatUtcTimestampToLocalStrings(notification?.confirmed_time_date);
  const {localTimeAndDate: {displayLocalTime, displayLocalDate} } = useLocalizeAndFormatDateTime(notification.confirmed_time_date)

  const { generateAccessToken /*, huddleAccessToken */} = useGenerateHuddleAccessToken();

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    await generateAccessToken(notification.roomId, event);
  };

  return (
    <ul>
      <li>
        {`Confirmed: Charli with ${notification.teacherName} on ${formattedDate} at ${formattedTime} in ${notification.teaching_lang}`}
      </li>
      <Link
        href={{
          pathname: '/room/[id]',
          query: {
            id: notification.roomId,
            roomRole: "Learner",
            notification: JSON.stringify(notification),
          },
        }}
        as={`/room/${notification.roomId}`}
        onClick={(e) => void handleClick(e)}
      >
        {`Charli with ${notification.learnerName} on ${displayLocalDate} ${displayLocalTime}`}
      </Link>
    </ul>
  );
};

export default ConfirmedLearningRequest;
