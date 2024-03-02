import { useNotificationContext } from "apps/frontend/src/contexts/NotificationContext";
import Notifications from "../Notifications/Notifications";
import Teachers from "./Teachers";
import { BaseNotification } from "apps/frontend/src/types/types";

interface LearnerViewProps {
  modeView:"learn" | "teach";
  selectedLang: string;
}


const LearnerView = ({modeView, selectedLang}: LearnerViewProps) => {
  const { notificationsContextValue } = useNotificationContext();
  const learnerNotifications: BaseNotification[] = notificationsContextValue.reduce((acc: BaseNotification[], sessionRow) => {
    if (sessionRow.isProposed) {
    //SentLearningRequest
      acc.push({
        type: 'learn',
        subType: "sentLearningRequest",
        session_id: sessionRow.session_id,
        request_time_date: sessionRow.request_time_date,
        teacherName: sessionRow.teacherName,
        learnerName: sessionRow.learnerName,
        teacher_id: sessionRow.teacher_id,
        learner_id: sessionRow.learner_id,
        teaching_lang: sessionRow.teaching_lang
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
        teaching_lang: sessionRow.teaching_lang
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
        teaching_lang: sessionRow.teaching_lang
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
      session_rejected_reason: sessionRow.session_rejected_reason,
      teaching_lang: sessionRow.teaching_lang
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
