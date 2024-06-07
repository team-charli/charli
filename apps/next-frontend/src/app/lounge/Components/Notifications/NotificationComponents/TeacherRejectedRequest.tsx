import { NotificationIface } from "@/types/types";

interface TeacherRejectedRequestProps {
  notification: NotificationIface;
}

const TeacherRejectedRequest = ({notification}: TeacherRejectedRequestProps ) => {
  const handleYes =  () => {
  }
  const handleNo = () => {
  }
  return (
    <ul>
      <li>{`${notification.teacherName} deeply regrets they can not satisfy the request to learn ${notification.teaching_lang}`}</li>
      <li>{`Would you like to schedule with ${()=>null/*getRandomTeacher()*/} __placeholder__instead?`}</li>
      <li onClick={handleYes}>yes</li>
      <li onClick={handleNo}>no</li>
    </ul>

  )
}
export default TeacherRejectedRequest
