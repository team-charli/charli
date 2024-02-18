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
    <>
      <ul className="flex items-center space-x-2">
        {teachers && teachers.map((user, index) => (
          <Teacher teacherName={user.name} key={index} teacherID={user.id} />
        ))}
      </ul>
    </>
  );
};
export default LearnerView;
