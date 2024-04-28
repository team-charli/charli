import { NotificationIface } from "@/types/types";

interface TeacherProposedAlternateProps {
  notification: NotificationIface;
}

const TeacherProposedAlternate = ({notification}: TeacherProposedAlternateProps ) => {
  return (
    <ul>
      <li>{`${notification.teacherName} has proposed an alternate date for learning ${notification.teaching_lang}. Would you like to accept?`}</li>
      <li>yes</li>
      <li>no</li>
    </ul>
  )
}

export default TeacherProposedAlternate;
