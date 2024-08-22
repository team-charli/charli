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
    <ul>
      <li>
        {`Confirmed: Charli in ${notification.teaching_lang} with ${notification.learnerName} on ${formattedDate} at ${formattedTime} as Teacher`}
      </li>
      <li>
        <span>
          <Link href={link}>click here</Link> when this light 🟡 turns green
        </span>
      </li>
    </ul>
  );
};

export default ConfirmedTeachingSession;
