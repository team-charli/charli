import { useNotifications } from "@/hooks/Lounge/useNotifications";
import UserList from "./UserList";
import Notifications from "./Notifications";

export const UserView = ({ modeView, selectedLang }: {modeView: "Learn" | "Teach", selectedLang: string}) => {
  const notifications = useNotifications();

  return (
    <>
      <Notifications notifications={notifications} modeView={modeView} />
      <UserList modeView={modeView} selectedLang={selectedLang} />
    </>
  );
};

