//TeacherProposedAlternate.tsx
import { NotificationIface } from "@/types/types";
import { cleanLangString, getCountryEmoji } from "@/utils/app";

interface TeacherProposedAlternateProps {
  notification: NotificationIface;
}

const TeacherProposedAlternate = ({notification}: TeacherProposedAlternateProps ) => {
  const countryEmoji = getCountryEmoji(notification.teaching_lang);
  const languageDisplay = cleanLangString(notification.teaching_lang);

  return (
    <ul>
      <li>{`${notification.teacherName} has proposed an alternate date for learning ${languageDisplay} ${countryEmoji}. Would you like to accept?`}</li>
      <li>yes</li>
      <li>no</li>
    </ul>
  )
}

export default TeacherProposedAlternate;
