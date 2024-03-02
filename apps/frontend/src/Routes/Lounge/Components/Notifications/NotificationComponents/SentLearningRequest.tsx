import { LearnModeNotification } from '../../Learner/LearnerView';
import { TeachModeNotification  } from '../../Teacher/TeacherView';
type Notification = LearnModeNotification | TeachModeNotification;

interface NotificationComponentProps {
  notification: Notification;
}

const SentLearningRequest = ({notification}: NotificationComponentProps) => {
  const okHandler = () => {
   return null
  }

  return (
  <ul>
    <li>{`Sent teaching request to ${notification.teacherName}. Ok to dismiss`}</li>
      <li onClick={okHandler}>Ok</li>
  </ul>
  )
}

export default SentLearningRequest;
