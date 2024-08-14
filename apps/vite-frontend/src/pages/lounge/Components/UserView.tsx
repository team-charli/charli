import { useNotifications } from "@/hooks/Lounge/useNotifications";
import Notifications from "./Notifications/Notifications";
import Teachers from "./Teachers";
import Learners from "./Learners";
import UserList from "./UserList";

export const UserView = ({ modeView, selectedLang }: {modeView: "Learn" | "Teach", selectedLang: string}) => {
  const notifications = useNotifications(modeView);

  return (
    <>
      <Notifications notifications={notifications} modeView={modeView} />
      <UserList modeView={modeView} selectedLang={selectedLang} />
    </>
  );
};

