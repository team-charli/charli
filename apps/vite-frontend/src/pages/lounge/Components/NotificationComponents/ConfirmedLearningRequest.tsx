// ConfirmedLearningRequest.tsx
import { useGenerateHuddleAccessToken } from '@/hooks/Lounge/QueriesMutations/useGenerateHuddleAccessToken';
import { useLocalizeAndFormatDateTime } from '@/hooks/utils/useLocalizeAndFormatDateTime';
import { ConfirmedLearningRequestProps } from '@/types/types';
import { formatUtcTimestampToLocalStrings } from '@/utils/app';
import {Link} from '@tanstack/react-router';

const ConfirmedLearningRequest = ({ notification: sessionData }: ConfirmedLearningRequestProps) => {
  if (!sessionData.roomId) throw new Error('sessionData.roomId is undefined')
  const { formattedDate, formattedTime } = formatUtcTimestampToLocalStrings(sessionData?.confirmed_time_date);
  const { localTimeAndDate: { displayLocalTime, displayLocalDate } } = useLocalizeAndFormatDateTime(sessionData.confirmed_time_date);
  const { generateAccessToken, isLoading } = useGenerateHuddleAccessToken();

  const handleClick = async (event: any) => {
    event.preventDefault();
    if (!sessionData.roomId) throw new Error('sessionData.roomId is undefined')

    await generateAccessToken(sessionData.roomId);
    // Navigate programmatically after generating the token
    window.location.href = `/room/${sessionData.roomId}`;
  };


  return (
    <ul>
      <li>
        {`Confirmed: Charli with ${sessionData.teacherName} on ${formattedDate} at ${formattedTime} in ${sessionData.teaching_lang}`}
      </li>
      <Link
        to="/room/$id"
        params={{ id: sessionData.roomId }}
        search={{
          roomRole: "Learner",
          sessionId: sessionData.session_id.toString(),
        }}
        onClick={handleClick}
      >
        {isLoading ? 'Loading...' : `Charli with ${sessionData.learnerName} on ${displayLocalDate} ${displayLocalTime}`}
      </Link>
    </ul>
  );
};

export default ConfirmedLearningRequest;
