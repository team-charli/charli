//TeacherRejectedRequest.tsx
import { NotificationIface } from "@/types/types";
import { cleanLangString, getCountryEmoji } from "@/utils/app";

interface TeacherRejectedRequestProps {
  notification: NotificationIface;
}

const TeacherRejectedRequest = ({notification}: TeacherRejectedRequestProps ) => {
  const countryEmoji = getCountryEmoji(notification.teaching_lang);
  const languageDisplay = cleanLangString(notification.teaching_lang);

  const handleYes =  () => {
  }
  const handleNo = () => {
  }
  return (
    <ul>
      <li>{`${notification.teacherName} deeply regrets they can not satisfy the request to learn ${languageDisplay} ${countryEmoji}`}</li>
      {/**<li>{`Would you like to schedule with ${()=> getRandomTeacher()} __placeholder__instead?`}</li>
      <li onClick={handleYes}>yes</li>
      <li onClick={handleNo}>no</li>
      */}
    </ul>

  )
}
export default TeacherRejectedRequest
