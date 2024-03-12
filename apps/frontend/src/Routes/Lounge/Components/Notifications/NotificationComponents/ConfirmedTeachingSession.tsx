import { BaseNotification } from 'apps/frontend/src/types/types';
import { formatUtcTimestampToLocalStrings } from 'apps/frontend/src/utils/app';
import { Link } from 'react-router-dom';

interface ConfirmedTeachingSessionProps {
  notification: BaseNotification;
}

const ConfirmedTeachingSession = ({notification}: ConfirmedTeachingSessionProps) => {
  const {formattedDate, formattedTime} = formatUtcTimestampToLocalStrings(notification.confirmed_time_date)
  const link = "/room/" + notification.roomId
  return (
    <ul>
      <li>
        {`Confirmed: Charli in ${notification.teaching_lang}with ${notification.learnerName} on ${formattedDate} at ${formattedTime} as Teacher}`}
      </li>
      <li>
        {`${<Link to={link}>click here</Link>} when this light 🟡 turns green`}
      </li>
    </ul>
  )
}
export default ConfirmedTeachingSession
