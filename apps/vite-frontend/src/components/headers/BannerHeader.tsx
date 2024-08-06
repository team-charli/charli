import { Link } from '@tanstack/react-router';
import charli_banner from '../../assets/charli_banner.png';

const BannerHeader = () => (
  <div className="flex justify-center w-full">
    <Link href="/">
        <img src={charli_banner} alt="Charli Banner" />
    </Link>
  </div>
);

export default BannerHeader;
