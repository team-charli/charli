import { NotificationIface } from '@/types/types';
import {ConfirmedLearningRequest, ConfirmedTeachingSession,ReceivedTeachingRequest, SentLearningRequest, TeacherProposedAlternate, TeacherRejectedRequest    } from './NotificationComponents';

interface NotificationComponentProps {
  notification: NotificationIface;
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
