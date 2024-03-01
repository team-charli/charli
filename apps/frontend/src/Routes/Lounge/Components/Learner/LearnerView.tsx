//TODO: implement counter_time_date submission and logic to set it as the confirmed_time_date if accepted
import { useNotificationContext } from "apps/frontend/src/contexts/NotificationContext";
import Notifications from "../Notifications/Notifications";
import Teachers from "./Teachers";

interface LearnerViewProps {
  modeView:"Learn" | "Teach";
  selectedLang: string;
}

enum NotificationAction {
  Ok = 'ok',
  Dismiss = 'dismiss',
  Confirm = 'confirm',
  Reject = 'reject',
  ProposeAlternate = 'proposeAlternate',
  Hide = 'hide',
}
enum NotificationType {
  Teacher = 'teacher',
  Learner = 'learner'
}

type SentLearningRequest = {
  type: NotificationType.Learner;
  session_id: number;
  request_time_date: string;
  teacherName: string;
  learnerName: string;
  teacher_id: string;
  learner_id: string;
  actions: [NotificationAction.Ok ];
};

type ConfirmedLearningRequest = {
  type: NotificationType.Learner;
  session_id: number;
  request_time_date: string;
  teacherName: string;
  learnerName: string;
  teacher_id: string;
  learner_id: string;
  confirmed_time_date: string;
  roomLink: string;
  actions: [NotificationAction.Ok];
};

type TeacherProposedAlternate = {
  type: NotificationType.Learner;
  session_id: number;
  request_time_date: string;
  counter_time_date: string;
  teacherName: string;
  learnerName: string;
  teacher_id: string;
  learner_id: string;
  actions: [NotificationAction.Confirm | NotificationAction.Reject];
};

type TeacherRejectedRequest = {
  type: NotificationType.Learner;
  session_id: number;
  request_time_date: string;
  teacherName: string;
  learnerName: string;
  teacher_id: string;
  learner_id: string;
  reason: string;
  actions: [NotificationAction.Dismiss];
};

export type Notification =
  |SentLearningRequest
  |ConfirmedLearningRequest
  |TeacherProposedAlternate
  |TeacherRejectedRequest

const LearnerView = ({modeView, selectedLang}: LearnerViewProps) => {
  const { notificationsContextValue } = useNotificationContext();
    const learnerNotifications: Notification[] = notificationsContextValue.filter(sessionRow => {
    if (sessionRow.isProposed && sessionRow.learnerName && sessionRow.request_time_date ) {
      return true;
    } else if (sessionRow.isAccepted && sessionRow.learnerName && sessionRow.confirmed_time_date && sessionRow.huddle_room_id) {
      return true;
    }  else {
      return false;
    }
  });


  return (
    <>
      <Notifications notifications={learnerNotifications} />
      <Teachers modeView={modeView} selectedLang={selectedLang}/>
    </>
  );
}

export default LearnerView;
