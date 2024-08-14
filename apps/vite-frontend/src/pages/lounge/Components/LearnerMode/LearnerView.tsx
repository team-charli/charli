import Notifications from "../Notifications/Notifications";
import Teachers from "./Teachers";
import { useNotifications } from "@/hooks/Lounge/useNotifications";

interface LearnerViewProps {
  modeView:"Learn" | "Teach";
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
