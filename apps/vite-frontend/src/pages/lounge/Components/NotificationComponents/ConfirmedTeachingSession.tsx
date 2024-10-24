//ConfirmedTeachingSession.tsx
import { generateAccessToken } from '@/Huddle/generateAccessToken';
import { NotificationIface } from '@/types/types';
import { formatUtcTimestampToLocalStrings } from '@/utils/app';
import {Link, useNavigate} from '@tanstack/react-router';
import { useGenerateHuddleAccessToken } from '../../hooks/QueriesMutations/useGenerateHuddleAccessToken';
import { useLocalizeAndFormatDateTime } from '@/utils/hooks/utils/useLocalizeAndFormatDateTime';
import { useMediaPermissions } from '@/Huddle/useMediaPermissions';

interface ConfirmedTeachingSessionProps {
  notification: NotificationIface;
}

const ConfirmedTeachingSession = ({ notification: sessionData }: ConfirmedTeachingSessionProps) => {
  const { formattedDate, formattedTime } = formatUtcTimestampToLocalStrings(sessionData.confirmed_time_date);
  const { localTimeAndDate: { displayLocalTime, displayLocalDate } } = useLocalizeAndFormatDateTime(sessionData.confirmed_time_date);

  const navigate = useNavigate({ from: '/lounge' }); // Assume we're navigating from the lounge page

  const { requestPermissions } = useMediaPermissions();
  const { generateAccessToken, isLoading } = useGenerateHuddleAccessToken();

  const handleClick = async (event: any) => {
    event.preventDefault();
    await requestPermissions();
    let accessTokenRes;
    try {
      await generateAccessToken({roomId: sessionData.roomId, hashedUserAddress: sessionData.hashed_teacher_address, role: "teacher"});
      navigate({
        to: '/room/$id',
        params: { id: sessionData.roomId ?? '' },
        search: {
          roomRole: "teacher",
          sessionId: sessionData.session_id?.toString() ?? '',
          hashedLearnerAddress: sessionData?.hashed_learner_address ?? '',
          hashedTeacherAddress: sessionData?.hashed_teacher_address ?? '',
        }
      });
    } catch (error) {
      console.error('accessTokenRes', accessTokenRes)
      console.error("Failed to generate access token:", error);
    }
  };

  return (
    <div className="grid grid-cols-3">
      <div className="col-start-2 col-span-2">

        <ul>
          <li className="flex items-center gap-2 bg-yellow-300 w-1/2 border-2 border-neutral-700">
            {`Confirmed: Charli in ${sessionData.teaching_lang} with ${sessionData.learnerName} on ${formattedDate} at ${formattedTime} as Teacher`}
          </li>
          <Link
            to="/room/$id"
            params={{ id: sessionData.roomId ?? ''}}
            search={{
              roomRole: "learner",
              sessionId: sessionData.session_id?.toString() ?? '',
              hashedLearnerAddress: sessionData?.hashed_learner_address ?? '',
              hashedTeacherAddress: sessionData?.hashed_teacher_address ?? '',
            }}
            onClick={handleClick}
          >
            {isLoading ? 'Loading...' : `Charli with ${sessionData.learnerName} on ${displayLocalDate} ${displayLocalTime}`}
          </Link>
        </ul>
      </div>
    </div>
  );
};

export default ConfirmedTeachingSession;
