// UserList.tsx
import useGetUsers from '../hooks/QueriesMutations/useGetUsers';
import UserItem from './UserItem';

interface UserListProps {
  modeView: "Learn" | "Teach";
  selectedLang: string;
}

export interface UserData {
  id: number;
  name: string;
  wants_to_learn_langs?: number[];
  wants_to_teach_langs?: number[];
}

const UserList = ({ modeView, selectedLang }: UserListProps) => {
  const { data: users, isLoading, error } = useGetUsers(selectedLang, modeView);

  //if (isLoading) return <div>Loading...</div>;
  if (error) console.error(error)

return (
  <div className="grid grid-cols-3">
    <div className="col-start-2 col-span-2">
      <h3 className="text-xl">{modeView === "Learn" ? "Teachers" : "Learners"}</h3>
      <ul className="flex flex-col items-start gap-2">
        {users && users.map((user: UserData, index: number) => (
          <UserItem
            key={user.id}
            userName={user.name}
            userID={user.id}
            language={selectedLang}
            modeView={modeView}
          />
        ))}
      </ul>
    </div>
  </div>
);
};

export default UserList;
