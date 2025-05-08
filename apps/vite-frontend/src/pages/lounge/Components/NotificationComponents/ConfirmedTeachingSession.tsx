//ConfirmedTeachingSession.tsx
import { NotificationIface } from '@/types/types';
import { Link, useNavigate } from '@tanstack/react-router';
import { useGenerateHuddleAccessToken } from '../../hooks/QueriesMutations/useGenerateHuddleAccessToken';
import { useLocalizeAndFormatDateTime } from '@/utils/hooks/utils/useLocalizeAndFormatDateTime';
import { cleanLangString, getCountryEmoji } from '@/utils/app';

interface ConfirmedTeachingSessionProps {
  notification: NotificationIface;
}

const ConfirmedTeachingSession = ({ notification: sessionData }: ConfirmedTeachingSessionProps) => {
  const isSessionSoon = sessionData.isImminent;
  const {
    localTimeAndDate: { displayLocalTime, displayLocalDate },
  } = useLocalizeAndFormatDateTime(sessionData.confirmed_time_date);

  const navigate = useNavigate({ from: '/lounge' });
  const { generateAccessToken, isLoading } = useGenerateHuddleAccessToken();

  const countryEmoji = getCountryEmoji(sessionData.teaching_lang);
  const languageDisplay = cleanLangString(sessionData.teaching_lang);

  const handleClick = async (event: any) => {
    event.preventDefault();

    if (!sessionData.roomId) {
      console.error('[DEBUG LOG] No roomId found in sessionData:', sessionData);
      return;
    }
    if (!sessionData.hashed_teacher_address) {
      console.error('[DEBUG LOG] No hashed_learner_address found in sessionData:', sessionData);
      return;
    }

    // 1) Generate Huddle access token
    let accessTokenRes;
    try {
      accessTokenRes = await generateAccessToken({
        roomId: sessionData.roomId,
        hashedUserAddress: sessionData.hashed_teacher_address,
        role: 'teacher',
      });

      // 2) Navigate to the Room route
      navigate({
        to: '/room/$id',
        params: { id: sessionData.roomId ?? '' },
        search: {
          roomRole: 'teacher',
          sessionId: sessionData.session_id?.toString() ?? '',
          hashedLearnerAddress: sessionData?.hashed_learner_address ?? '',
          hashedTeacherAddress: sessionData?.hashed_teacher_address ?? '',
          controllerAddress: sessionData?.controller_address ?? '',
        },
      });
    } catch (error) {
      console.error('[DEBUG LOG] Teacher handleClick => generateAccessToken failed, accessTokenRes:', accessTokenRes);
      console.error('[DEBUG LOG] error:', error);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col">
        <div className="mb-2 text-sm sm:text-base text-gray-600">
          <span className="font-medium">Teaching</span> {sessionData.learnerName}
        </div>
        
        {isSessionSoon && sessionData.roomId ? (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
            <Link
              className="flex items-center gap-2 w-full sm:w-auto 
                        bg-yellow-500 hover:bg-yellow-600 text-white 
                        px-3 sm:px-4 py-2 sm:py-2.5
                        rounded-md text-sm sm:text-base
                        transition-colors shadow-sm
                        focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1"
              to="/room/$id"
              params={{ id: sessionData.roomId ?? '' }}
              search={{
                roomRole: 'teacher',
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
              Teaching <span className="font-medium">{sessionData.learnerName}</span> at <span className="font-medium">{displayLocalTime}</span>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 sm:p-4">
            <div className="flex items-center gap-2 text-yellow-800 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Confirmed Teaching Session</span>
            </div>
            <div className="text-sm sm:text-base flex flex-col">
              <div>
                <span className="text-gray-600">Student:</span> <span className="font-medium">{sessionData.learnerName}</span>
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

export default ConfirmedTeachingSession;
