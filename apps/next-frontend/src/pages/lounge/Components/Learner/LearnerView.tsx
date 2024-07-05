import { useNotificationContext } from "@/contexts/NotificationContext";
import Notifications from "../Notifications/Notifications";
import Teachers from "./Teachers";
import { NotificationIface } from "@/types/types";
import { useNotifications } from "@/hooks/Lounge/useNotifications";

interface LearnerViewProps {
  modeView:"learn" | "teach";
  selectedLang: string;
}

const LearnerView = ({ modeView, selectedLang }: LearnerViewProps) => {
  const learnerNotifications = useNotifications(modeView);

  return (
    <>
      <Notifications notifications={learnerNotifications} modeView={modeView} />
      <Teachers modeView={modeView} selectedLang={selectedLang} />
    </>
  );
};

export default LearnerView;
