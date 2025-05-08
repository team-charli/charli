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
    <div className="w-full">
      <div className="flex flex-col">
        <div className="mb-2 text-sm sm:text-base text-gray-600">
          <span className="font-medium">Learning</span> from {sessionData.teacherName}
        </div>
        
        {isSessionSoon && sessionData.roomId ? (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
            <Link
              className="flex items-center gap-2 w-full sm:w-auto 
                      bg-blue-600 hover:bg-blue-700 text-white 
                      px-3 sm:px-4 py-2 sm:py-2.5
                      rounded-md text-sm sm:text-base
                      transition-colors shadow-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
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
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <span>{isLoading ? 'Loading...' : 'Join Now'}</span>
              </div>
            </Link>
            
            <div className="text-xs sm:text-sm text-gray-600">
              Session with <span className="font-medium">{sessionData.teacherName}</span> at <span className="font-medium">{displayLocalTime}</span>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 sm:p-4">
            <div className="flex items-center gap-2 text-green-800 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Confirmed Session</span>
            </div>
            <div className="text-sm sm:text-base flex flex-col">
              <div>
                <span className="text-gray-600">Teacher:</span> <span className="font-medium">{sessionData.teacherName}</span>
              </div>
              <div>
                <span className="text-gray-600">Time:</span> <span className="font-medium">{displayLocalDate} at {displayLocalTime}</span>
              </div>
              <div>
                <span className="text-gray-600">Language:</span> <span className="font-medium">{languageDisplay}</span> {countryEmoji}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmedLearningRequest;
