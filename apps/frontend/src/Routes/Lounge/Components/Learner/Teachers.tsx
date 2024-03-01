import useLocalStorage from "@rehooks/local-storage";
import Teacher from "./Teacher";
import useGetTeachers from "apps/frontend/src/hooks/Lounge/useGetTeachers";

interface TeachersProps {
  selectedLang: string;
  modeView: "Learn" | "Teach";
}

const Teachers = ({modeView, selectedLang }: TeachersProps) => {
  const [userId] = useLocalStorage<number>("userID");
  const teachers = useGetTeachers(selectedLang, modeView);

  return (
    <>
      <ul className="flex items-center space-x-2">
        {teachers && teachers
          .map((user, index) =>
             <Teacher teacherName={user.name} teacherID={user.id}/>
          )}
      </ul>
    </>
  );
}

export default Teachers;
