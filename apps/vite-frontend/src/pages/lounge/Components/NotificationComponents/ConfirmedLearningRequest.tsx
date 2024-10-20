// ConfirmedLearningRequest.tsx
import { ConfirmedLearningRequestProps } from '@/types/types';
import { useLocalizeAndFormatDateTime } from '@/utils/hooks/utils/useLocalizeAndFormatDateTime';
import {Link, redirect, useNavigate} from '@tanstack/react-router';
import { useGenerateHuddleAccessToken } from '../../hooks/QueriesMutations/useGenerateHuddleAccessToken';

const ConfirmedLearningRequest = ({ notification: sessionData }: ConfirmedLearningRequestProps) => {

  const { localTimeAndDate: { displayLocalTime, displayLocalDate } } = useLocalizeAndFormatDateTime(sessionData.confirmed_time_date);
  const navigate = useNavigate({ from: '/lounge' }); // Assume we're navigating from the lounge page

  const { generateAccessToken, isLoading } = useGenerateHuddleAccessToken();

  const handleClick = async (event: any) => {
    console.log("onClick called");
    event.preventDefault();
    let accessTokenRes;
    try {
      await generateAccessToken(sessionData.roomId);
      navigate({
        to: '/room/$id',
        params: { id: sessionData.roomId ?? '' },
        search: {
          roomRole: "learner",
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
          <li className="flex items-center gap-2 bg-green-300 w-1/2 border-2 border-neutral-700">
            {`Confirmed: Charli with ${sessionData.teacherName} on ${displayLocalDate } at ${displayLocalTime} in ${sessionData.teaching_lang}`}
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

export default ConfirmedLearningRequest;
