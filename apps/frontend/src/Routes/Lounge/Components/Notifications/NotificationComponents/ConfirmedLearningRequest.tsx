import { BaseNotification } from "apps/frontend/src/types/types";
import { formatUtcTimestampToLocalStrings } from "apps/frontend/src/utils/app";
import { Link } from "react-router-dom";

interface ConfirmedLearningRequestProps {
  notification: BaseNotification;
}

const ConfirmedLearningRequest = ({notification}: ConfirmedLearningRequestProps ) => {
 const { formattedDate, formattedTime } = formatUtcTimestampToLocalStrings(notification?.confirmed_time_date)
  const link = "/room/" + notification.roomId
  return (
    <ul>
      <li>
        {`Confirmed: Charli with ${notification.teacherName} on ${formattedDate} at ${formattedTime} in ${notification.teaching_lang} `}
      </li>
      <li>
        {`${<Link to={link}>click here</Link>} when this light 🟡 turns green`}
      </li>
      </ul>
  )
}

export default ConfirmedLearningRequest;
