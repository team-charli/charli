interface TeacherNotifications {
  notifications:  TeacherNotification[] | LearnerNotification[];
}

interface LearnerNotifications {

}

interface LearnerNotification {

}
interface TeacherNotification {

}

interface NotificationsProps {
  notifications: Notification[];
}

const Notifications = ({notifications}: NotificationsProps) => {
  return (
    null
  );
}

export default Notifications
