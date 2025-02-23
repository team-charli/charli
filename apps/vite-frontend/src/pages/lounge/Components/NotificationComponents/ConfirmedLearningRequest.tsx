// ConfirmedLearningRequest.tsx
import { ConfirmedLearningRequestProps } from '@/types/types';
import { useLocalizeAndFormatDateTime } from '@/utils/hooks/utils/useLocalizeAndFormatDateTime';
import { Link, useNavigate } from '@tanstack/react-router';
import { useGenerateHuddleAccessToken } from '../../hooks/QueriesMutations/useGenerateHuddleAccessToken';
import { cleanLangString, getCountryEmoji } from '@/utils/app';

const ConfirmedLearningRequest = ({ notification: sessionData }: ConfirmedLearningRequestProps) => {
  const isSessionSoon = sessionData.isImminent;
  const countryEmoji = getCountryEmoji(sessionData.teaching_lang);
  const languageDisplay = cleanLangString(sessionData.teaching_lang);

  const {
    localTimeAndDate: { displayLocalTime, displayLocalDate }
  } = useLocalizeAndFormatDateTime(sessionData.confirmed_time_date);

  const navigate = useNavigate({ from: '/lounge' });

  const { generateAccessToken, isLoading } = useGenerateHuddleAccessToken();

  const handleClick = async (event: any) => {
    event.preventDefault();

    // 1) If no roomId, abort
    if (!sessionData.roomId) {
      console.error('[DEBUG LOG] No roomId found in sessionData:', sessionData);
      return;
    }
    if (!sessionData.hashed_learner_address) {
      console.error('[DEBUG LOG] No hashed_learner_address found in sessionData:', sessionData);
      return;
    }

    // 2) Generate Huddle access token
    let accessTokenRes;
    try {
      accessTokenRes = await generateAccessToken({
        roomId: sessionData.roomId,
        hashedUserAddress: sessionData.hashed_learner_address,
        role: 'learner',
      });

      // 4) Navigate to the Room
      navigate({
        to: '/room/$id',
        params: { id: sessionData.roomId ?? '' },
        search: {
          roomRole: 'learner',
          sessionId: sessionData.session_id?.toString() ?? '',
          hashedLearnerAddress: sessionData?.hashed_learner_address ?? '',
          hashedTeacherAddress: sessionData?.hashed_teacher_address ?? '',
          controllerAddress: sessionData?.controller_address ?? '',
        },
      });
    } catch (error) {
      console.error('[DEBUG LOG] Learner handleClick => generateAccessToken failed, accessTokenRes:', accessTokenRes);
      console.error('[DEBUG LOG] error:', error);
    }
  };

  return (
    <div className="grid grid-cols-3">
      <div className="col-start-2 col-span-2">
        {isSessionSoon && sessionData.roomId ? (
          <Link
            className="flex items-center gap-2 w-1/2 border-2 border-neutral-700 bg-slate-100 hover:bg-slate-200 cursor-pointer px-2 py-1"
            to="/room/$id"
            params={{ id: sessionData.roomId ?? '' }}
            search={{
              roomRole: 'learner',
              sessionId: sessionData.session_id?.toString() ?? '',
              hashedLearnerAddress: sessionData?.hashed_learner_address ?? '',
              hashedTeacherAddress: sessionData?.hashed_teacher_address ?? '',
              controllerAddress: sessionData?.controller_address ?? '',
            }}
            onClick={handleClick}
          >
            <span className="inline-block w-3 h-3 bg-blue-500" />
            {isLoading ? 'Loading...' : `Join: Charli with ${sessionData.teacherName} at ${displayLocalTime}`}
          </Link>
        ) : (
          <div className="flex items-center gap-2 bg-green-300 w-1/2 border-2 border-neutral-700 px-2 py-1">
            {`Confirmed: Charli with ${sessionData.teacherName} on ${displayLocalDate} at ${displayLocalTime} in ${languageDisplay} ${countryEmoji}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmedLearningRequest;
