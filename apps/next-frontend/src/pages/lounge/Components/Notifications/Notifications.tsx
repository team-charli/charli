import { toLower } from 'lodash';
import useLocalStorage from '@rehooks/local-storage';
import NotificationComponent from './NotificationComponent';
import { NotificationIface } from 'apps/frontend/src/types/types';

interface NotificationsProps {
  notifications: NotificationIface[];
  modeView: "learn" | "teach";
}

const Notifications = ({notifications: all_notifications , modeView}: NotificationsProps) => {

  const [userId] = useLocalStorage<number>("userID")
  const matchModeView = all_notifications.filter(notification =>
    notification.type === toLower(modeView))

  const involveUser = matchModeView.filter(notification => notification &&  (notification.learner_id  === userId)  || notification.teacher_id);

  function hasConfirmedTimeDate(notif: NotificationIface): notif is NotificationIface {
    return 'confirmed_time_date' in notif && notif.confirmed_time_date !== undefined;
  }

  function hasCounterTimeDate(notif: NotificationIface): notif is NotificationIface {
    return 'counter_time_date' in notif && notif.counter_time_date !== undefined;
  }

  const sortedNotifications = involveUser.sort((a, b) => {
    const getSignificantDate = (notif: NotificationIface): Date => {
      if (hasConfirmedTimeDate(notif) && notif.confirmed_time_date !== undefined) {
        return new Date(notif.confirmed_time_date);
      } else if (hasCounterTimeDate(notif) && notif.counter_time_date !== undefined) {
        return new Date(notif.counter_time_date);
      } else {
        return new Date(notif.request_time_date);
      }
    };

    const aDate = getSignificantDate(a);
    const bDate = getSignificantDate(b);

    const today = new Date();
    const aDiff = (aDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    const bDiff = (bDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    return bDiff - aDiff;
  });

  return (
    <div>
      {sortedNotifications.map((notification: NotificationIface, index: number) => {
        return <NotificationComponent key={index} notification={notification} />;
      })}
    </div>

  );
};

export default Notifications
