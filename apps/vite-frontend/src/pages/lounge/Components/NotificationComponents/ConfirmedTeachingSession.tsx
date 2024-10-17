//ConfirmedTeachingSession.tsx
import { NotificationIface } from '@/types/types';
import { formatUtcTimestampToLocalStrings } from '@/utils/app';
import {Link} from '@tanstack/react-router';

interface ConfirmedTeachingSessionProps {
  notification: NotificationIface;
}

const ConfirmedTeachingSession = ({ notification }: ConfirmedTeachingSessionProps) => {
  const { formattedDate, formattedTime } = formatUtcTimestampToLocalStrings(notification.confirmed_time_date);
  const link = `/room/${notification.roomId}?roomRole=teacher&sessionId=${notification.session_id}&hashedLearnerAddress=${notification.hashed_learner_address}&hashedTeacherAddress=${notification.hashed_teacher_address}`;

  return (
    <div className="grid grid-cols-3">
      <div className="col-start-2 col-span-2">

        <ul>
          <li className="flex items-center gap-2 bg-yellow-300 w-1/2 border-2 border-neutral-700">
            {`Confirmed: Charli in ${notification.teaching_lang} with ${notification.learnerName} on ${formattedDate} at ${formattedTime} as Teacher`}
          </li>
          <li>
            <span>
              <Link href={link}>click here</Link> when this light 🟡 turns green
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ConfirmedTeachingSession;
