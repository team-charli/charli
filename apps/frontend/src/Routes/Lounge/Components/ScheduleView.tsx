import { useGetScheduleReqs } from "apps/frontend/src/hooks/Lounge/useGetScheduleReqs";
import ScheduleItem from "./ScheduleItem";

interface ScheduleViewProps {
  modeView: "Learn" | "Teach" | "Schedule";
}

const ScheduleView = ({modeView}: ScheduleViewProps ) => {
  const {learnerOriginReqs, teacherOriginReqs} = useGetScheduleReqs(modeView);
  const {learnerOriginReqCancs, teacherOriginReqCancs} = useGetScheduleCancs();
  const {learnerOriginReqConfs, teacherOriginReqConfs} = useGetScheduleConfs();

  return (
    <>
      <ul className="flex items-center space-x-2">
        {learnerOriginReqs?.length ? learnerOriginReqs.map((item, index) => (
          <ScheduleItem utcReqTimeDate={item.request_time_date} learnerName={item.learner_id[0].name} />
        )): null}
      </ul>
    </>
  );
}

export default ScheduleView;
