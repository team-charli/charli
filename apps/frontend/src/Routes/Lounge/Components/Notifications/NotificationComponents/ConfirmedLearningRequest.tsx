import { BaseNotification } from "apps/frontend/src/types/types";
import { formatUtcTimestampToLocalStrings } from "apps/frontend/src/utils/app";

interface ConfirmedLearningRequestProps {
  notification: BaseNotification;
}

const ConfirmedLearningRequest = ({notification}: ConfirmedLearningRequestProps ) => {
 const { formattedDate, formattedTime } = formatUtcTimestampToLocalStrings(notification?.confirmed_time_date)
  return (
    <ul>
      <li>
        {`Confirmed: Charli with ${notification.teacherName} on ${formattedDate} at ${formattedTime} `}
      </li>
      <li>
        {`click here when this light 🟡 turns green ${link}`}
      </li>
    </ul>
  )
}

export default ConfirmedLearningRequest;
