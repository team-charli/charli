import { ExtendedSession } from "../NotificationContext";

export const defaultNotificationContextObj: ExtendedSession = {
  isTeacherToLearner: false,
  isLearnerToTeacher: false,
  isProposed: false,
  isAmended: false,
  isAccepted: false,
  isRejected: false,
  isExpired: false,
  request_origin: null,
  learner_id: null,
  teacher_id: null,
  request_time_date: "",
  counter_time_date:  null,
  confirmed_time_date: null,
  session_rejected_reason: null,
}
