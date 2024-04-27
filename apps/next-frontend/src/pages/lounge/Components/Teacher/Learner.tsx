interface LearnerProps {
  learnerName: string;
  learnerId: number;
}
const Learner = ({learnerName, learnerId}: LearnerProps) => {
  return (
  <li key={learnerId}> {learnerName} </li>
  )
}

export default Learner;
