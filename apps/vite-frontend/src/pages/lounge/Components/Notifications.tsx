//Notifications.tsx
import { NotificationIface } from '@/types/types';
import { getSignificantDate } from '@/utils/app';
import NotificationItem from './NotificationItem';

interface NotificationsProps {
  notifications: NotificationIface[];
  modeView: "Learn" | "Teach";
}

const Notifications = ({ notifications }: NotificationsProps) => {
  const activeNotifications = notifications.filter(n => !n.isNotificationExpired);

  const sortedNotifications = activeNotifications
    .sort((a, b) => getSignificantDate(b).getTime() - getSignificantDate(a).getTime());

  if (sortedNotifications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 sm:p-8 md:p-10 text-center">
        <div className="flex flex-col items-center">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-gray-800 mb-2">No Notifications</h3>
          <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">
            You don't have any active notifications right now. When you receive session requests or updates, they'll appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 md:mb-5">
        Notifications ({sortedNotifications.length})
      </h2>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100">
        {sortedNotifications.map((notification, index) => (
          <div 
            key={`${notification.session_id}-${index}`} 
            className={`p-3 sm:p-4 md:p-5 ${index === 0 ? 'rounded-t-lg' : ''} ${
              index === sortedNotifications.length - 1 ? 'rounded-b-lg' : ''
            }`}
          >
            <NotificationItem notification={notification} />
          </div>
        ))}
      </div>
    </div>
  );
};


export default Notifications;
