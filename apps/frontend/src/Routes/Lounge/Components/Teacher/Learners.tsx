import Learner from './Learner';
import useGetLearners from 'apps/frontend/src/hooks/Lounge/useGetLearners';

interface LearnersProps {
  selectedLang: string;
  modeView: "learn" | "teach";
}
const Learners = ({ selectedLang, modeView }: LearnersProps) => {
  const learners = useGetLearners(selectedLang, modeView)

return (
  <div className="grid grid-cols-3">
    <div className="col-start-2 col-span-2">
      <h3>Teachers</h3>
      <ul>
        {learners && learners.map((user, index) => (
          <Learner learnerName={user.name} key={index} learnerId={user.id} />
        ))}
      </ul>
    </div>
  </div>
);
};
export default Learners;
