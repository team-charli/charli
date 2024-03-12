import { BaseNotification } from "apps/frontend/src/types/types";

type ReceivedTeachingRequestProps = {
  notification: BaseNotification ;
};

const ReceivedTeachingRequest = ({notification}: ReceivedTeachingRequestProps ) => {
  const acceptHandler = () => {
    return null
  }
  const rejectHandler = () => {
    return null
  }
  const ammendHandler  = () => {
    return null
  }

  return (
    <ul>
      <li>{`Charli with ${notification.learnerName} at ${notification.request_time_date}? in ${notification.teaching_lang} ?`}
      </li>
      <li onClick={acceptHandler}> accept </li>
      <li onClick={rejectHandler}>reject</li>
      <li onClick={ammendHandler}>reschedule</li>
    </ul>
  )
}

export default ReceivedTeachingRequest;
