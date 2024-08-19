import UserList from "./UserList";
import Notifications from "./Notifications";
import { useNotifications } from "../hooks/useNotifications";

export const UserView = ({ modeView, selectedLang }: {modeView: "Learn" | "Teach", selectedLang: string}) => {
  const notifications = useNotifications();

  return (
    <>
      <Notifications notifications={notifications} modeView={modeView} />
      <UserList modeView={modeView} selectedLang={selectedLang} />
    </>
  );
};

