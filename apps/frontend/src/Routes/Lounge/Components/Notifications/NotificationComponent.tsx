import { BaseNotification } from 'apps/frontend/src/types/types';
import ConfirmedLearningRequest from './NotificationComponents/ConfirmedLearningRequest';
import ConfirmedTeachingSession from './NotificationComponents/ConfirmedTeachingSession';
import ReceivedTeachingRequest from './NotificationComponents/ReceivedTeachingRequest';
import SentLearningRequest from './NotificationComponents/SentLearningRequest';
import TeacherProposedAlternate from './NotificationComponents/TeacherProposedAlternate';
import TeacherRejectedRequest from './NotificationComponents/TeacherRejectedRequest';

interface NotificationComponentProps {
  notification: BaseNotification;
}

const NotificationComponent = ({notification}: NotificationComponentProps) => {
  return (
    <>
      {notification.subType === 'sentLearningRequest '  ? <SentLearningRequest notification={notification}/> : null}
      {notification.subType === 'receivedTeachingRequest ' ? <ReceivedTeachingRequest notification={notification}/>: null}
      {notification.subType === 'confirmedTeachingSession ' ? <ConfirmedTeachingSession notification={notification}/> : null}
      {notification.subType === 'confirmedLearningRequest ' ? <ConfirmedLearningRequest notification={notification}/> : null }
      {notification.subType === 'teacherProposedAlternate ' ? <TeacherProposedAlternate notification={notification}/> : null }
      {notification.subType === 'teacherRejectedRequest ' ? <TeacherRejectedRequest notification={notification}/> : null}
    </>
  );
}

export default NotificationComponent
