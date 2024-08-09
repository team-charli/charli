import Teacher from "./Teacher";
import useGetTeachers from "@/hooks/Lounge/QueriesMutations/useGetTeachers";

interface TeachersProps {
  selectedLang: string;
  modeView: "Learn" | "Teach";
}

const Teachers = ({modeView, selectedLang }: TeachersProps) => {
  const { data: teachers, isLoading, error } = useGetTeachers(selectedLang, modeView);
  // console.log('teachers', teachers)
  return (
    <>
  <div className="grid grid-cols-3">
    <div className="col-start-2 col-span-2">
        <h3>Teachers</h3>
        <ul className="flex items-center space-x-2">
          {teachers && teachers
            .map((user, index) =>
              <Teacher teacherName={user.name} teacherID={user.id} teachingLang={selectedLang} key={index}/>
            )}
        </ul>
      </div>
    </div>
    </>
  );
}

export default Teachers;
