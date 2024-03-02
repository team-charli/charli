import { LearnModeNotification } from '../../Learner/LearnerView';
import { TeachModeNotification  } from '../../Teacher/TeacherView';
type Notification = LearnModeNotification | TeachModeNotification;

type ReceivedTeachingRequestProps = {
  notification: Notification;
};

const ReceivedTeachingRequest = ({notification}: ReceivedTeachingRequestProps ) => {
  return (
    <ul>
      <li>{`Charli with ${notification.learnerName} at ${notification.request_time_date}?`}
      </li>
      <li>
      {accept}
      </li>
      <li>{reject}</li>
      <li>{reschedule}</li>
    </ul>
  )
}

export default ReceivedTeachingRequest;
