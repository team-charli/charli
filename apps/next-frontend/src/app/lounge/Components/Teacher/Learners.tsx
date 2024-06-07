import useGetLearners from '@/hooks/Lounge/useGetLearners';
import Learner from './Learner';

interface LearnersProps {
  selectedLang: string;
  modeView: "Learn" | "Teach";
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
