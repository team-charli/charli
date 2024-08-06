// ConfirmedLearningRequest.tsx
import { useGenerateHuddleAccessToken } from '@/hooks/Lounge/QueriesMutations/useGenerateHuddleAccessToken';
import { useLocalizeAndFormatDateTime } from '@/hooks/utils/useLocalizeAndFormatDateTime';
import { ConfirmedLearningRequestProps } from '@/types/types';
import { formatUtcTimestampToLocalStrings } from '@/utils/app';
import {Link} from '@tanstack/react-router';

const ConfirmedLearningRequest = ({ notification }: ConfirmedLearningRequestProps) => {
  const { formattedDate, formattedTime } = formatUtcTimestampToLocalStrings(notification?.confirmed_time_date);
  const { localTimeAndDate: { displayLocalTime, displayLocalDate } } = useLocalizeAndFormatDateTime(notification.confirmed_time_date);
  const { generateAccessToken, isLoading } = useGenerateHuddleAccessToken();

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    await generateAccessToken(notification.roomId);
    // Navigate programmatically after generating the token
    window.location.href = `/room/${notification.roomId}`;
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
        onClick={handleClick}
      >
        {isLoading ? 'Loading...' : `Charli with ${notification.learnerName} on ${displayLocalDate} ${displayLocalTime}`}
      </Link>
    </ul>
  );
};

export default ConfirmedLearningRequest;
