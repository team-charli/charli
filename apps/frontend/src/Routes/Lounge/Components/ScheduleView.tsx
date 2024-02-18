import { useGetScheduleItems } from "apps/frontend/src/hooks/Lounge/useGetScheduleItems";
import Learner from "./Learner";
import ScheduleItem from "./ScheduleItem";

interface ScheduleViewProps {
  modeView: "Learn" | "Teach" | "Schedule";
}

const ScheduleView = ({modeView}: ScheduleViewProps ) => {

  const {learnerOriginReqs, teacherOriginReqs} = useGetScheduleItems(modeView);
  return (
    <>
      <ul className="flex items-center space-x-2">
        {learnerOriginReqs?.length ? learnerOriginReqs.map((item, index) => (
        <ScheduleItem  />
  )): null}
      </ul>
    </>
  );
}

export default ScheduleView;
