import { BaseNotification } from "apps/frontend/src/types/types";

interface TeacherProposedAlternateProps {
  notification: BaseNotification;

}

const TeacherProposedAlternate = ({notification}: TeacherProposedAlternateProps ) => {
  return (
    <ul>
      <li>{`${notification.teacherName} has proposed an alternate date for learning ${language}. Would you like to accept?`}</li>
      <li>{yes}</li>
      <li>{no}</li>
    </ul>
  )
}

export default TeacherProposedAlternate;
