import useLocalStorage from "@rehooks/local-storage";
import { ExtendedSession } from "apps/frontend/src/contexts/NotificationContext";
import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";
import { useLocalizeAndFormatDateTime } from "apps/frontend/src/hooks/utils/useLocalizeAndFormatDateTime";
import { Link } from "react-router-dom";
interface LearnerToTeachScheduleItemProps {
  notification: ExtendedSession;
}
const RoomlinkTeacherToLearner= ({notification: {isProposed, isAmended, isAccepted, isRejected, learnerName, confirmed_time_date, huddle_room_id }}: LearnerToTeachScheduleItemProps) => {
  const [huddleAccessToken, setHuddleAccessToken] = useLocalStorage('huddle-access-token')
  const {client: supabaseClient, supabaseLoading} = useSupabase();
  const {localTimeAndDate: {displayLocalTime, displayLocalDate} } = useLocalizeAndFormatDateTime(confirmed_time_date)


    const generateAccessToken = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (supabaseClient && !supabaseLoading && huddle_room_id?.length) {
      const { data, error } = await supabaseClient
        .functions
        .invoke('create-huddle-access-tokens', {
          body: huddle_room_id
        })
      if (!error) {
        console.log('generated Huddle AccessToken')
        setHuddleAccessToken(data.accessToken);
      }
    }
  }

  return (
    <li>
      <Link to={`${huddle_room_id}`} onClick={generateAccessToken}>
        {`Charli with ${learnerName} on ${displayLocalDate} ${displayLocalTime}`}
      </Link>
    </li>
  )
}
export default RoomlinkTeacherToLearner;
