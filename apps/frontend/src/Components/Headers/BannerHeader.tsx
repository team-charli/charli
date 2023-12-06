import { Link } from 'react-router-dom'
import charli_banner from '../../assets/charli_banner.png'

const BannerHeader = () => (
  <div className="flex justify-center w-full">
    <Link to={'/'}><img src={charli_banner}/></Link>
  </div>
)

export default BannerHeader
