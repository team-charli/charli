import { useNotificationContext } from "apps/frontend/src/contexts/NotificationContext";
import Notifications from "../Notifications/Notifications";
import Learners from "./Learners";

interface TeacherViewProps {
  modeView: "learn" | "teach";
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

type NotificationActions = NotificationAction[];

interface BaseNotification {
  type: 'learn' | 'teach';
  subType: string;
  session_id: number;
  request_time_date: string;
  teacherName?: string;
  learnerName?: string;
  teacher_id: number;
  learner_id: number;
  actions: NotificationActions;
  // confirmed_time_date?: string;
  // counter_time_date?: string;
}

export interface ReceivedTeachingRequestType extends BaseNotification {
  actions: [NotificationAction.Confirm , NotificationAction.Reject , NotificationAction.ProposeAlternate];
};
export interface ConfirmedTeachingSessionType extends BaseNotification{
  confirmed_time_date: string;
  counter_time_date?: string;
  roomId: string;
  actions: [NotificationAction.Ok];
};

export type TeachModeNotification =  ReceivedTeachingRequestType | ConfirmedTeachingSessionType

const TeacherView = ({modeView, selectedLang}: TeacherViewProps) => {
  const { notificationsContextValue } = useNotificationContext();
  const teacherNotifications: TeachModeNotification[] = notificationsContextValue.reduce((acc: TeachModeNotification[], sessionRow) => {
    if (sessionRow.isProposed) {
      //ReceivedTeachingRequest
      acc.push({
        type: 'teach',
        subType: "receivedTeachingRequest",
        session_id: sessionRow.session_id,
        request_time_date: sessionRow.request_time_date,
        learnerName: sessionRow.learnerName,
        learner_id: sessionRow.learner_id,
        teacher_id: sessionRow.teacher_id,
        actions: [NotificationAction.Confirm , NotificationAction.Reject, NotificationAction.ProposeAlternate]
      });
    } else if (sessionRow.isAccepted) {
      //ConfirmedTeachingSession
      acc.push({
        type: 'teach',
        subType: "confirmedTeachingSession",
        session_id: sessionRow.session_id,
        request_time_date: sessionRow.request_time_date,
        counter_time_date: sessionRow.counter_time_date,
        confirmed_time_date: sessionRow.confirmed_time_date,
        learnerName: sessionRow.learnerName,
        learner_id: sessionRow.learner_id,
        teacher_id: sessionRow.teacher_id,
        roomId: sessionRow.huddle_room_id,
        actions: [NotificationAction.Ok],
      })
    }
    return acc;
  }, []);

  return (
    <>
      <Notifications notifications={teacherNotifications} modeView={modeView}/>
      <Learners modeView={modeView} selectedLang={selectedLang} />
    </>
  )
}

export default TeacherView;
