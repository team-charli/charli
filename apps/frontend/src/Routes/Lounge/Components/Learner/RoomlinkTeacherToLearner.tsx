import useLocalStorage from "@rehooks/local-storage";
import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";
import { useLocalizeAndFormatDateTime } from "apps/frontend/src/hooks/utils/useLocalizeAndFormatDateTime";
import { NotificationIface } from "apps/frontend/src/types/types";
import { Link } from "react-router-dom";
interface LearnerToTeachScheduleItemProps {
  notification: NotificationIface;
}
//TODO: Merge into ConfirmedLeaneringRequest
const RoomlinkTeacherToLearner= ({notification: { learnerName, confirmed_time_date, roomId }}: LearnerToTeachScheduleItemProps) => {
  const [huddleAccessToken, setHuddleAccessToken] = useLocalStorage('huddle-access-token')
  const {client: supabaseClient, supabaseLoading} = useSupabase();
  const {localTimeAndDate: {displayLocalTime, displayLocalDate} } = useLocalizeAndFormatDateTime(confirmed_time_date)

  const generateAccessToken = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (supabaseClient && !supabaseLoading && roomId?.length) {
      const { data, error } = await supabaseClient
        .functions
        .invoke('create-huddle-access-tokens', {
          body: roomId
        })
      if (!error) {
        console.log('generated Huddle AccessToken')
        setHuddleAccessToken(data.accessToken);
      }
    }
  }

  return (
    <li>
      <Link to={{pathname:`${roomId}`, state: }} onClick={generateAccessToken}>
        {`Charli with ${learnerName} on ${displayLocalDate} ${displayLocalTime}`}
      </Link>
    </li>
  )
}
export default RoomlinkTeacherToLearner;
