import { NotificationIface } from '@/types/types';
import { formatUtcTimestampToLocalStrings } from '@/utils/app';
import Link from 'next/link';

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
        <Link href={{pathname: `/room/${notification.roomId}`, state: {notification, roomRole: 'learner'}  }}>click here</Link> to join room
      </li>
      </ul>
  )
}

export default ConfirmedLearningRequest;
