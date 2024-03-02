import { LearnModeNotification } from '../../Learner/LearnerView';
import { TeachModeNotification  } from '../../Teacher/TeacherView';
type Notification = LearnModeNotification | TeachModeNotification;

interface ConfirmedTeachingSessionProps {
  notification: Notification;
}

const ConfirmedTeachingSession = ({notification}: ConfirmedTeachingSessionProps) => {
  return (
    <ul>
      <li>
        {`Confirmed: Charli with ${notification.learnerName} on ${notification.type} at ${notification.} `}
      </li>
      <li>
        {`click here when this light 🟡 turns green ${link} `}
      </li>
    </ul>
  )
}
export default ConfirmedTeachingSession
