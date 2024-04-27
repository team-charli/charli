import { NotificationIface } from "apps/frontend/src/types/types";

interface NotificationComponentProps {
  notification: NotificationIface;
}

const SentLearningRequest = ({notification}: NotificationComponentProps) => {
  const okHandler = () => {
   return null
  }

  return (
  <ul>
    <li>{`Sent Charli request to ${notification.teacherName} for ${notification.teaching_lang}. Ok to dismiss`}</li>
      <li onClick={okHandler}>Ok</li>
  </ul>
  )
}

export default SentLearningRequest;
