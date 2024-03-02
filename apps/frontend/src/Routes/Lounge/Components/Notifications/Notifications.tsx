import { toLower } from 'lodash';
import useLocalStorage from '@rehooks/local-storage';
import NotificationComponent from './NotificationComponent';
import { BaseNotification } from 'apps/frontend/src/types/types';


interface NotificationsProps {
  notifications: BaseNotification[];
  modeView: "learn" | "teach";
}

const Notifications = ({notifications: all_notifications , modeView}: NotificationsProps) => {
  const [userId] = useLocalStorage<number>("userID")
  const matchModeView = all_notifications.filter(notification =>
    notification.type === toLower(modeView))

  const involveUser = matchModeView.filter(notification => notification &&  (notification.learner_id  === userId)  || notification.teacher_id);


  // Type guard to check if a notification has a 'confirmed_time_date'
  function hasConfirmedTimeDate(notif: BaseNotification): notif is BaseNotification {
    return 'confirmed_time_date' in notif && notif.confirmed_time_date !== undefined;
  }

  // Type guard to check if a notification has a 'counter_time_date'
  function hasCounterTimeDate(notif: BaseNotification): notif is BaseNotification {
    return 'counter_time_date' in notif && notif.counter_time_date !== undefined;
  }

  const sortedNotifications = involveUser.sort((a, b) => {
    // Updated helper function to use type guards
    const getSignificantDate = (notif: BaseNotification): Date => {
      // Since confirmed_time_date and counter_time_date are optional, they can be undefined.
      // We need to check for undefined before passing them to the Date constructor.
      if (hasConfirmedTimeDate(notif) && notif.confirmed_time_date !== undefined) {
        return new Date(notif.confirmed_time_date);
      } else if (hasCounterTimeDate(notif) && notif.counter_time_date !== undefined) {
        return new Date(notif.counter_time_date);
      } else {
        // request_time_date should always be present, so we can safely use it directly.
        return new Date(notif.request_time_date);
      }
    };

    const aDate = getSignificantDate(a);
    const bDate = getSignificantDate(b);

    // Calculate the difference in days from today; closer or future dates should come first
    const today = new Date();
    const aDiff = (aDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    const bDiff = (bDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    // For descending order, notifications closer to or beyond today come first
    return bDiff - aDiff;
  });

  return (
    <div>
      {sortedNotifications.map((notification: BaseNotification, index: number) => {
        return <NotificationComponent key={index} notification={notification} />;
      })}
    </div>

  );
};

export default Notifications
