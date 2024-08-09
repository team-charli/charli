import { useAuth } from "@/contexts/AuthContext"
import Lounge from "./Lounge"

const LoungeRoute = () => {
  const authSuccess = useAuth().isSuccess

  if (authSuccess) {
    return <Lounge />
  } else {
    return null
  }
}

export default LoungeRoute;
