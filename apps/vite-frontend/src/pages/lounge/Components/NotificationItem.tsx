// NotificationItem.tsx
import { NotificationIface } from "@/types/types";
import {
  ConfirmedLearningRequest,
  ConfirmedTeachingSession,
  ReceivedTeachingRequest,
  SentLearningRequest,
  TeacherProposedAlternate,
  TeacherRejectedRequest
} from './NotificationComponents';

interface NotificationItemProps {
  notification: NotificationIface;
}

const NotificationItem = ({ notification }: NotificationItemProps) => {
  const renderNotification = () => {
    switch(notification.subType) {
      case 'sentLearningRequest':
        return <SentLearningRequest notification={notification} />;
      case 'receivedTeachingRequest':
        return <ReceivedTeachingRequest notification={notification} />;
      case 'confirmedTeachingSession':
        return <ConfirmedTeachingSession notification={notification} />;
      case 'confirmedLearningRequest':
        return <ConfirmedLearningRequest notification={notification} />;
      case 'teacherProposedAlternate':
        return <TeacherProposedAlternate notification={notification} />;
      case 'teacherRejectedRequest':
        return <TeacherRejectedRequest notification={notification} />;
      default:
        return <p>Unknown notification type</p>;
    }
  };

  return (
    <div className="notification-item transition-all duration-200 hover:bg-gray-50 rounded-md">
      {renderNotification()}
    </div>
  );
};

export default NotificationItem;
