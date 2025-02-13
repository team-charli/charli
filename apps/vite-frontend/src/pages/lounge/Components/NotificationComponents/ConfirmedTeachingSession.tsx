//ConfirmedTeachingSession.tsx
import { NotificationIface } from '@/types/types';
import {Link, useNavigate} from '@tanstack/react-router';
import { useGenerateHuddleAccessToken } from '../../hooks/QueriesMutations/useGenerateHuddleAccessToken';
import { useLocalizeAndFormatDateTime } from '@/utils/hooks/utils/useLocalizeAndFormatDateTime';
import { useMediaPermissions } from '@/Huddle/useMediaPermissions';
import { cleanLangString, getCountryEmoji } from '@/utils/app';

interface ConfirmedTeachingSessionProps {
  notification: NotificationIface;
}

const ConfirmedTeachingSession = ({ notification: sessionData }: ConfirmedTeachingSessionProps) => {
  const isSessionSoon = sessionData.isImminent;
  const isExpired = sessionData.isExpired;
  const { localTimeAndDate: { displayLocalTime, displayLocalDate } } = useLocalizeAndFormatDateTime(sessionData.confirmed_time_date);
  const navigate = useNavigate({ from: '/lounge' });
  const { requestPermissions } = useMediaPermissions();
  const { generateAccessToken, isLoading } = useGenerateHuddleAccessToken();

  const countryEmoji = getCountryEmoji(sessionData.teaching_lang);
  // Remove the country part from the language string (e.g., remove " (Mexico)")
  const languageDisplay = cleanLangString(sessionData.teaching_lang);

  const handleClick = async (event: any) => {
    event.preventDefault();
    await requestPermissions();
    let accessTokenRes;
    try {
      await generateAccessToken({
        roomId: sessionData.roomId,
        hashedUserAddress: sessionData.hashed_teacher_address,
        role: "teacher"
      });
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
        { isSessionSoon ? (
          <Link
            className="flex items-center gap-2 w-1/2 border-2 border-neutral-700 bg-slate-100 hover:bg-slate-200 cursor-pointer px-2 py-1"
            to="/room/$id"
            params={{ id: sessionData.roomId ?? ''}}
            search={{
              roomRole: "teacher",
              sessionId: sessionData.session_id?.toString() ?? '',
              hashedLearnerAddress: sessionData?.hashed_learner_address ?? '',
              hashedTeacherAddress: sessionData?.hashed_teacher_address ?? '',
            }}
            onClick={handleClick}
          >
            <span className="inline-block w-3 h-3 bg-blue-500" />
            {isLoading ? 'Loading...' : `Join: Teaching ${sessionData.learnerName} at ${displayLocalTime}`}
          </Link>
        ) : (
            <div className="flex items-center gap-2 bg-yellow-300 w-1/2 border-2 border-neutral-700 px-2 py-1">
              {`Confirmed: Teaching ${sessionData.learnerName} in ${languageDisplay} ${countryEmoji} on ${displayLocalDate} at ${displayLocalTime}`}
            </div>
          )}
      </div>
    </div>
  );
};
export default ConfirmedTeachingSession;
