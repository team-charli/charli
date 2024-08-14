//Notifications.tsx
import { NotificationIface } from '@/types/types';
import { getSignificantDate } from '@/utils/app';
import NotificationItem from './NotificationItem';

interface NotificationsProps {
  notifications: NotificationIface[];
  modeView: "Learn" | "Teach";
}

const Notifications = ({ notifications }: NotificationsProps) => {

  const sortedNotifications = notifications
  .sort((a, b) => getSignificantDate(b).getTime() - getSignificantDate(a).getTime());

  return (
    <div>
      {sortedNotifications.map((notification, index) => (
        <NotificationItem key={`${notification.session_id}-${index}`} notification={notification} />
      ))}
    </div>
  );
};


export default Notifications;
