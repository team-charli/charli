import { useNotificationContext } from "apps/frontend/src/contexts/NotificationContext";
import Notifications from "../Notifications/Notifications";
import Learners from "./Learners";

interface TeacherViewProps {
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

type ReceivedTeachingRequest = {
  type: NotificationType.Teacher;
  session_id: number;
  request_time_date: string;
  teacherName: string;
  learnerName: string;
  teacher_id: string;
  learner_id: string;
  actions: [NotificationAction.Confirm | NotificationAction.Reject | NotificationAction.ProposeAlternate];
};

type ConfirmedTeachingSession = {
  type: NotificationType.Teacher;
  session_id: number;
  request_time_date: string; // ISO string or similar
  teacherName: string;
  learnerName: string;
  teacher_id: string;
  roomId: string;
  actions: [NotificationAction.Ok];
};

const TeacherView = ({modeView, selectedLang}: TeacherViewProps) => {
  const { notificationsContextValue } = useNotificationContext();

  const teacherNotifications = notificationsContextValue.filter(sessionRow => {
    if (sessionRow.isAccepted)
    if (sessionRow.isAmended && sessionRow.learnerName && sessionRow.counter_time_date) {
    return true;
  } else if (sessionRow.isRejected && sessionRow.session_rejected_reason) {
      return true;
    }

  });

  return (
    <>
      <Notifications notifications={teacherNotifications} />
      <Learners modeView={modeView} selectedLang={selectedLang} />
    </>
  )
}

export default TeacherView;
