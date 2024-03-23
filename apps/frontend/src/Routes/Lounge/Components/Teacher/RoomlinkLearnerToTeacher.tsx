import useLocalStorage from "@rehooks/local-storage";
import { generateAccessToken } from "apps/frontend/src/Huddle/generateAccessToken";
import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";
import { useLocalizeAndFormatDateTime } from "apps/frontend/src/hooks/utils/useLocalizeAndFormatDateTime";
import { ExtendedSession } from "apps/frontend/src/types/types";
import { Link } from "react-router-dom";
interface LearnerToTeachScheduleItemProps {
  notification: ExtendedSession;
}
const RoomlinkLearnerToTeacher = ({notification: {isProposed, isAmended, isAccepted, isRejected, learnerName, confirmed_time_date, huddle_room_id }}: LearnerToTeachScheduleItemProps) => {
  const [huddleAccessToken, setHuddleAccessToken] = useLocalStorage('huddle-access-token')
  const {client: supabaseClient, supabaseLoading} = useSupabase();
  const {localTimeAndDate: {displayLocalTime, displayLocalDate} } =   useLocalizeAndFormatDateTime(confirmed_time_date)

  return (
    <li>
      <Link to={`${huddle_room_id}`} onClick={(event) => generateAccessToken(event, supabaseClient, supabaseLoading, huddle_room_id, setHuddleAccessToken)}>
        {`Charli with ${learnerName} on ${displayLocalDate} ${displayLocalTime}`}
      </Link>
    </li>
  )
}
export default RoomlinkLearnerToTeacher;
