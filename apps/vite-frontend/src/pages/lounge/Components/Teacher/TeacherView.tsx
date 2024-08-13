import { useNotificationContext } from "@/contexts/NotificationContext";
import Notifications from "../Notifications/Notifications";
import Learners from "./Learners";
import { NotificationIface } from "@/types/types";

interface TeacherViewProps {
  modeView: "Learn" | "Teach";
  selectedLang: string;
}


const TeacherView = ({modeView, selectedLang}: TeacherViewProps) => {
  const { notificationsContextValue } = useNotificationContext();
  const teacherNotifications: NotificationIface[] = notificationsContextValue.reduce((acc: NotificationIface[], sessionRow) => {
    if (sessionRow.isProposed) {
      //ReceivedTeachingRequest
      acc.push({
        type: 'Teach',
        subType: "receivedTeachingRequest",
        session_id: sessionRow.session_id,
        request_time_date: sessionRow.request_time_date,
        learnerName: sessionRow.learnerName,
        teacherName: sessionRow.teacherName,
        learner_id: sessionRow.learner_id,
        teacher_id: sessionRow.teacher_id,
        teaching_lang: sessionRow.teaching_lang
      });
    } else if (sessionRow.isAccepted) {
      //ConfirmedTeachingSession
      acc.push({
        type: 'Teach',
        subType: "confirmedTeachingSession",
        session_id: sessionRow.session_id,
        request_time_date: sessionRow.request_time_date,
        counter_time_date: sessionRow.counter_time_date,
        confirmed_time_date: sessionRow.confirmed_time_date,
        learnerName: sessionRow.learnerName,
        teacherName: sessionRow.teacherName,
        learner_id: sessionRow.learner_id,
        teacher_id: sessionRow.teacher_id,
        roomId: sessionRow.huddle_room_id,
        teaching_lang: sessionRow.teaching_lang
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
