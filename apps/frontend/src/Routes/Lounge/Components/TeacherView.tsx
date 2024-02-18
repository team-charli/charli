import useGetLearners from "apps/frontend/src/hooks/Lounge/useGetLearners";
import Learner from "./Learner";

interface TeacherViewProps {
  modeView:"Learn" | "Teach" | "Schedule";
  selectedLang: string;
}
const TeacherView = ({modeView, selectedLang }: TeacherViewProps) => {
  const learners = useGetLearners(selectedLang, modeView);
  return (
    <>
      <ul className="flex items-center space-x-2">
        {learners && learners.map((user, index) => (
          <Learner learnerName={user.name} key={index}/>
        ))}
      </ul>
    </>
  );
}

export default TeacherView;
