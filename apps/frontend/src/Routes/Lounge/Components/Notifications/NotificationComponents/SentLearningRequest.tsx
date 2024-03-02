import { BaseNotification } from "apps/frontend/src/types/types";

interface NotificationComponentProps {
  notification: BaseNotification;
}

const SentLearningRequest = ({notification}: NotificationComponentProps) => {
  const okHandler = () => {
   return null
  }

  return (
  <ul>
    <li>{`Sent teaching request to ${notification.teacherName}. Ok to dismiss`}</li>
      <li onClick={okHandler}>Ok</li>
  </ul>
  )
}

export default SentLearningRequest;
