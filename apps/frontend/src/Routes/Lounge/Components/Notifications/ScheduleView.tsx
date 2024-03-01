import { useNotificationContext } from "apps/frontend/src/contexts/NotificationContext";
import { useNotificationRouter } from "apps/frontend/src/hooks/Lounge/useNotificationRouter";
import RoomlinkTeacherToLearner from "./RoomlinkTeacherToLearner";
import RoomlinkLearnerToTeacher from "./RoomlinkLearnerToTeacher";

interface ScheduleViewProps {
  modeView: "Learn" | "Teach" | "Schedule";
}

const ScheduleView = ({modeView}: ScheduleViewProps ) => {
  const {notificationsContextValue: notifications} = useNotificationContext();
  const {teacherToLearnerNotifications, learnerToTeacherNotifications} = useNotificationRouter(notifications);
  console.log('ScheduleView component: notifications from Context', notifications)
//TODO: all notifications types
// ScheduleView badly named?? I think you may need the userId somewhere
  return (
    <>
      <ul className="flex items-center space-x-2">
        {modeView === "Schedule" && learnerToTeacherNotifications.map(notification => (
          notification?.huddle_room_id?.length && notification.session_id  ? <RoomlinkLearnerToTeacher key={notification.session_id} notification={notification} /> : null
        ))}
        {modeView === "Schedule" && teacherToLearnerNotifications.map(notification => (
          notification?.huddle_room_id?.length && notification.session_id ? <RoomlinkTeacherToLearner key={notification.session_id} notification={notification} /> : null
        ))}


      </ul>
    </>
  );
}
// {learnerOriginReqs?.length ? learnerOriginReqs.map((item, index) => (
//   <ScheduleItem utcReqTimeDate={item.request_time_date} learnerName={item.learner_id[0].name} />
// )): null}

export default ScheduleView;
