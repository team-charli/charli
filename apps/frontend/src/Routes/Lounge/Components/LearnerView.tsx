import { useEffect } from 'react';
import Teacher from './Teacher';
import useGetTeachers from 'apps/frontend/src/hooks/Lounge/useGetTeachers';

interface LearnerViewProps {
  selectedLang: string;
  modeView: string;
}
const LearnerView = ({ selectedLang, modeView }: LearnerViewProps) => {
  const teachers = useGetTeachers(selectedLang, modeView);

  useEffect(() => {
    console.log('users', teachers)
  }, [teachers])

return (
<div className="grid grid-cols-[1fr,4fr,1fr]">
    <div className="col-start-2 col-span-2">
      <h3>Teachers</h3>
      <ul>
        {teachers && teachers.map((user, index) => (
          <Teacher teacherName={user.name} key={index} teacherID={user.id} />
        ))}
      </ul>
    </div>
  </div>
);
};
export default LearnerView;
