import { useAuth } from '@/contexts/AuthContext'
import Onboard from './Onboard'

const OnboardRoute = () => {
  const authSuccess = useAuth().isSuccess
  if (authSuccess) {
    return Onboard;
  } else {
    return null
  }
}

export default OnboardRoute
