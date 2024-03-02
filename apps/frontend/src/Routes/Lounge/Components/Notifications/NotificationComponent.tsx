import { LearnModeNotification } from '../Learner/LearnerView';
import { TeachModeNotification  } from '../Teacher/TeacherView';
import ConfirmedLearningRequest from './NotificationComponents/ConfirmedLearningRequest';
import ConfirmedTeachingSession from './NotificationComponents/ConfirmedTeachingSession';
import ReceivedTeachingRequest from './NotificationComponents/ReceivedTeachingRequest';
import SentLearningRequest from './NotificationComponents/SentLearningRequest';
import TeacherProposedAlternate from './NotificationComponents/TeacherProposedAlternate';
import TeacherRejectedRequest from './NotificationComponents/TeacherRejectedRequest';

type Notification = LearnModeNotification | TeachModeNotification;

interface NotificationComponentProps {
  notificaion: Notification;
}
    //

const NotificationComponent = ({notificaion}: NotificationComponentProps) => {
  return (
    <>
      {notificaion.subType === 'sentLearningRequest' ? <SentLearningRequest notificaion={notificaion}/> : null}
      {notificaion.subType === 'receivedTeachingRequest' ? <ReceivedTeachingRequest />: null}
      {notificaion.subType ==='confirmedTeachingSession' ? <ConfirmedTeachingSession /> : null}
      {notificaion.subType === 'confirmedLearningRequest' ? <ConfirmedLearningRequest /> : null }
      {notificaion.subType === 'teacherProposedAlternate' ? <TeacherProposedAlternate /> : null }
      {notificaion.subType === 'TeacherRejectedRequest' ? <TeacherRejectedRequest /> : null}
    </>
  );
}

export default NotificationComponent
