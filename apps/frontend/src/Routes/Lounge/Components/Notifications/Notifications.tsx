import { toLower } from 'lodash';
import useLocalStorage from '@rehooks/local-storage';
import NotificationComponent from './NotificationComponent';
import { ConfirmedLearningRequest, LearnModeNotification, SentLearningRequest, TeacherProposedAlternate, TeacherRejectedRequest } from '../Learner/LearnerView';
import {ConfirmedTeachingSession, ReceivedTeachingRequest, TeachModeNotification} from '../Teacher/TeacherView';

type Notification = LearnModeNotification | TeachModeNotification;


export function isConfirmedTeachingSession(notification: Notification): notification is ConfirmedTeachingSession {
  return notification.subType === 'confirmedTeachingSession';
}
export function isSentLearningRequest(notification: Notification): notification is SentLearningRequest {
  return notification.subType === 'sentLearningRequest'
}
export function isReceivedTeachingRequest(notification: Notification): notification is ReceivedTeachingRequest {
  return notification.subType === 'receivedTeachingRequest'
}
export function isConfirmedLearningRequest(notification: Notification): notification is ConfirmedLearningRequest {
  return notification.subType === 'confirmedLearningRequest'
}
export function isTeacherProposedAlternate(notification: Notification): notification is TeacherProposedAlternate {
  return notification.subType === 'teacherProposedAlternate'
}

export function isTeacherRejectedRequest(notification: Notification): notification is TeacherRejectedRequest {
  return notification.subType === 'teacherRejectedRequest'
}

interface NotificationsProps {
  notifications: Notification[];
  modeView: "learn" | "teach";
}

const Notifications = ({notifications: all_notifications , modeView}: NotificationsProps) => {
  const [userId] = useLocalStorage<number>("userID")
  const matchModeView = all_notifications.filter(notification =>
    notification.type === toLower(modeView))

  const involveUser = matchModeView.filter(notification => notification &&  (notification.learner_id  === userId)  || notification.teacher_id);

  // Assuming NotificationUnion is the union of all notification types you have
  type NotificationUnion = LearnModeNotification | TeachModeNotification;

  // Type guard to check if a notification has a 'confirmed_time_date'
  function hasConfirmedTimeDate(notif: NotificationUnion): notif is ConfirmedLearningRequest | ConfirmedTeachingSession {
    return 'confirmed_time_date' in notif && notif.confirmed_time_date !== undefined;
  }

  // Type guard to check if a notification has a 'counter_time_date'
  function hasCounterTimeDate(notif: NotificationUnion): notif is TeacherProposedAlternate {
    return 'counter_time_date' in notif && notif.counter_time_date !== undefined;
  }

  const sortedNotifications = involveUser.sort((a, b) => {
    // Updated helper function to use type guards
    const getSignificantDate = (notif: NotificationUnion) => {
      if (hasConfirmedTimeDate(notif)) {
        return new Date(notif.confirmed_time_date);
      }
      if (hasCounterTimeDate(notif)) {
        return new Date(notif.counter_time_date);
      }
      return new Date(notif.request_time_date); // This date is always present
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
      {sortedNotifications.map((notification: NotificationUnion, index: number) => {
        return <NotificationComponent key={index} notification={notification} />;
      })}
    </div>

  );
};

export default Notifications
