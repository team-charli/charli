import useLocalStorage from '@rehooks/local-storage';
import NotificationComponent from './NotificationComponent';
import { NotificationIface } from '@/types/types';

interface NotificationsProps {
  notifications: NotificationIface[];
  modeView: "Learn" | "Teach";
}

const Notifications = ({ notifications, modeView }: NotificationsProps) => {
  const [userId] = useLocalStorage<number>("userID");

  const filteredNotifications = notifications
  .filter(notification =>
    notification.type === modeView.toLowerCase() &&
      (notification.learner_id === userId || notification.teacher_id === userId)
  )
  .sort((a, b) => getSignificantDate(b).getTime() - getSignificantDate(a).getTime());

  return (
    <div>
      {filteredNotifications.map((notification, index) => (
        <NotificationComponent key={`${notification.session_id}-${index}`} notification={notification} />
      ))}
    </div>
  );
};

const getSignificantDate = (notification: NotificationIface): Date => {
  if (notification.confirmed_time_date) {
    return new Date(notification.confirmed_time_date);
  } else if (notification.counter_time_date) {
    return new Date(notification.counter_time_date);
  } else {
    return new Date(notification.request_time_date);
  }
};

export default Notifications;
