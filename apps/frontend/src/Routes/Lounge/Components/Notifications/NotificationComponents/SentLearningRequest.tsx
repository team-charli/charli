import { LearnModeNotification } from '../../Learner/LearnerView';
import { TeachModeNotification  } from '../../Teacher/TeacherView';
type Notification = LearnModeNotification | TeachModeNotification;

interface NotificationComponentProps {
  notificaion: Notification;
}

const SentLearningRequest = ({notificaion}: NotificationComponentProps) => {
  return (
  <ul>
    <li>{`Ok to dismiss`}</li>
      <li>{`${notificaion.}`}</li>
  </ul>
  )
}

export default SentLearningRequest;
