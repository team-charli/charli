import { LearnModeNotification } from '../../Learner/LearnerView';
import { TeachModeNotification  } from '../../Teacher/TeacherView';
type Notification = LearnModeNotification | TeachModeNotification;

interface ConfirmedLearningRequestProps {
  notification: Notification;
}

const ConfirmedLearningRequest = ({notification}: ConfirmedLearningRequestProps ) => {
  return (
    <ul>
      <li>
        {`Confirmed: Charli with ${teacherName} on ${date} at ${time} `}
      </li>
      <li>
        {`click here when this light 🟡 turns green ${link}`}
      </li>
    </ul>
  )
}

export default ConfirmedLearningRequest;
