import { LearnModeNotification } from '../../Learner/LearnerView';
import { TeachModeNotification  } from '../../Teacher/TeacherView';
type Notification = LearnModeNotification | TeachModeNotification;

interface TeacherProposedAlternateProps {
  notification: Notification;

}

const TeacherProposedAlternate = ({notification}: TeacherProposedAlternateProps ) => {
  return (
    <ul>
      <li>{`${teacherName} has proposed an alternate date for learning ${language}. Would you like to accept?`}</li>
      <li>{yes}</li>
      <li>{no}</li>
    </ul>
  )
}

export default TeacherProposedAlternate;
