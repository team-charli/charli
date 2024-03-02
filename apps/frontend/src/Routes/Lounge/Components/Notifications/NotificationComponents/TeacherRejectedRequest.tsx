import { LearnModeNotification } from '../../Learner/LearnerView';
import { TeachModeNotification  } from '../../Teacher/TeacherView';
type Notification = LearnModeNotification | TeachModeNotification;
interface TeacherRejectedRequestProps {
  notification: Notification;
}

const TeacherRejectedRequest = ({notification}: TeacherRejectedRequestProps ) => {
  return (
    <ul>
      <li>{`${teacherName} deeply regrets they can not satisfy the request to learn ${language}`}</li>
      <li>{`Would you like to schedule with ${randomTeacher} instead?`}</li>
      <li>{yes}</li>
      <li>{no}</li>
    </ul>

  )
}
export default TeacherRejectedRequest
