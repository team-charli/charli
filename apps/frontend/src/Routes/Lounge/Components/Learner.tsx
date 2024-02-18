interface LearnerProps {
  learnerName: string;
  key: number;
}
const Learner = ({learnerName, key}: LearnerProps) => {
  return (
  <li key={key}> {learnerName} </li>
  )
}

export default Learner;
