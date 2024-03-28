import { NotificationIface } from "apps/frontend/src/types/types";
import { formatUtcTimestampToLocalStrings } from "apps/frontend/src/utils/app";
import { Link } from "react-router-dom";

interface ConfirmedLearningRequestProps {
  notification: NotificationIface;
}

const ConfirmedLearningRequest = ({notification}: ConfirmedLearningRequestProps ) => {
 const { formattedDate, formattedTime } = formatUtcTimestampToLocalStrings(notification?.confirmed_time_date)
  return (
    <ul>
      <li>
        {`Confirmed: Charli with ${notification.teacherName} on ${formattedDate} at ${formattedTime} in ${notification.teaching_lang} `}
      </li>
      <li>
        <Link to={{pathname: `/room/${notification.roomId}`, state: {notification, roomRole: 'learner'}  }}>click here</Link> to join room
      </li>
      </ul>
  )
}

export default ConfirmedLearningRequest;
