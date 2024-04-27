import BannerHeader from "@/components/headers/BannerHeader"
import IconHeader from "@/components/headers/IconHeader"
import LoginView from "./Components/LoginView"

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


