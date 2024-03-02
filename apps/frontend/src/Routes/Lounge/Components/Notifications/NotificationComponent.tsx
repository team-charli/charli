import { LearnModeNotification } from '../Learner/LearnerView';
import { TeachModeNotification  } from '../Teacher/TeacherView';
import ConfirmedLearningRequest from './NotificationComponents/ConfirmedLearningRequest';
import ConfirmedTeachingSession from './NotificationComponents/ConfirmedTeachingSession';
import ReceivedTeachingRequest from './NotificationComponents/ReceivedTeachingRequest';
import SentLearningRequest from './NotificationComponents/SentLearningRequest';
import TeacherProposedAlternate from './NotificationComponents/TeacherProposedAlternate';
import TeacherRejectedRequest from './NotificationComponents/TeacherRejectedRequest';
import { isConfirmedLearningRequest, isConfirmedTeachingSession, isReceivedTeachingRequest, isSentLearningRequest, isTeacherProposedAlternate, isTeacherRejectedRequest } from './Notifications';

type Notification = LearnModeNotification | TeachModeNotification;

interface NotificationComponentProps {
  notification: Notification;
}
    //

const NotificationComponent = ({notification}: NotificationComponentProps) => {
  return (
    <>
      {isSentLearningRequest(notification) ? <SentLearningRequest notification={notification}/> : null}
      {isReceivedTeachingRequest(notification) ? <ReceivedTeachingRequest notification={notification}/>: null}
      {isConfirmedTeachingSession(notification) ? <ConfirmedTeachingSession notification={notification}/> : null}
      {isConfirmedLearningRequest(notification) ? <ConfirmedLearningRequest notification={notification}/> : null }
      {isTeacherProposedAlternate(notification) ? <TeacherProposedAlternate notification={notification}/> : null }
      {isTeacherRejectedRequest(notification) ? <TeacherRejectedRequest notification={notification}/> : null}
    </>
  );
}

export default NotificationComponent
