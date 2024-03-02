import { useNotificationContext } from "apps/frontend/src/contexts/NotificationContext";
import Notifications from "../Notifications/Notifications";
import Teachers from "./Teachers";

export enum NotificationAction {
  Ok = 'ok',
  Dismiss = 'dismiss',
  Confirm = 'confirm',
  Reject = 'reject',
  ProposeAlternate = 'proposeAlternate',
  Hide = 'hide',
}

interface LearnerViewProps {
  modeView:"learn" | "teach";
  selectedLang: string;
}
type NotificationActions = NotificationAction[];
interface BaseNotification {
  type: 'learn' | 'teach';
  subType: string;
  session_id: number;
  request_time_date: string;
  teacherName: string;
  learnerName?: string; // Make optional properties that may not exist in all types
  teacher_id: number;
  learner_id: number;
  actions: NotificationActions;
  // confirmed_time_date?: string;
  // counter_time_date?: string;
  roomId?: string;
}

interface SentLearningRequest extends BaseNotification {
  subType: string;
  actions: [NotificationAction.Ok ];
};

export interface ConfirmedLearningRequest extends BaseNotification {
  confirmed_time_date: string;
  roomId: string;
  subType: "ConfirmedLearningRequest";
  actions: [NotificationAction.Ok];
}

export interface TeacherProposedAlternate extends BaseNotification{
  counter_time_date: string;
  actions: NotificationActions;
};

interface TeacherRejectedRequest extends BaseNotification {
  reason: string;
  actions: [NotificationAction.Dismiss];
};

export type LearnModeNotification =
|SentLearningRequest
|ConfirmedLearningRequest
|TeacherProposedAlternate
|TeacherRejectedRequest

const LearnerView = ({modeView, selectedLang}: LearnerViewProps) => {
  const { notificationsContextValue } = useNotificationContext();
  const learnerNotifications: LearnModeNotification[] = notificationsContextValue.reduce((acc: LearnModeNotification[], sessionRow) => {
    if (sessionRow.isProposed) {
    //SentLearningRequest
      acc.push({
        type: 'learn',
        subType: "sentLearningRequest",
        session_id: sessionRow.session_id,
        request_time_date: sessionRow.request_time_date,
        teacherName: sessionRow.teacherName,
        teacher_id: sessionRow.teacher_id,
        learner_id: sessionRow.learner_id,
        actions: [NotificationAction.Ok],
      });
    } else if (sessionRow.isAccepted) {
      //ConfirmedLearningRequest
      acc.push({
        type: 'learn',
        subType: "confirmedLearningRequest",
        session_id: sessionRow.session_id,
        request_time_date: sessionRow.request_time_date,
        confirmed_time_date: sessionRow.confirmed_time_date,
        roomId: "YourRoomLinkHere",
        teacherName: sessionRow.teacherName,
        learnerName: sessionRow.learnerName,
        teacher_id: sessionRow.teacher_id,
        learner_id: sessionRow.learner_id,
        actions: [NotificationAction.Ok],
      });
    } else if (sessionRow.isAmended) {
      //TeacherProposedAlternate
      acc.push({
        type: 'learn',
        subType: "teacherProposedAlternate",
        session_id: sessionRow.session_id,
        counter_time_date: sessionRow.counter_time_date,
        request_time_date: sessionRow.request_time_date,
        teacherName: sessionRow.teacherName,
        learnerName: sessionRow.learnerName,
        teacher_id: sessionRow.teacher_id,
        learner_id: sessionRow.learner_id,
        actions: [NotificationAction.Confirm, NotificationAction.Reject]
      })
    } else if (sessionRow.isRejected) {
      //TeacherRejectedRequest
      acc.push({
      type: 'learn',
      subType: "teacherRejectedRequest",
      session_id: sessionRow.session_id,
      request_time_date: sessionRow.request_time_date,
      teacherName: sessionRow.teacherName,
      learnerName: sessionRow.learnerName,
      teacher_id: sessionRow.teacher_id,
      learner_id: sessionRow.learner_id,
      reason: sessionRow.session_rejected_reason,
      actions: [NotificationAction.Dismiss]
    })
    }
    return acc;
  }, []);


  return (
    <>
      <Notifications notifications={learnerNotifications} modeView={modeView} />
      <Teachers modeView={modeView} selectedLang={selectedLang}/>
    </>
  );
}

export default LearnerView;
