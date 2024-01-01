import LoginView from "../../Components/Views/LoginView"
import BannerHeader from '../../Components/Headers/BannerHeader'
import IconHeader from '../../Components/Headers/IconHeader'

export const Login = () => {
  return (
    <>
    <IconHeader />
    <BannerHeader />
    <LoginView parentIsRoute={true} />
    </>
  )
}

export default Login

