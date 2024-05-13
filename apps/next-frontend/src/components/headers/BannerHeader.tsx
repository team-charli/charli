import Link from 'next/link';
import charli_banner from '../../assets/charli_banner.png';

const BannerHeader = () => (
  <div className="flex justify-center w-full" data-cy="banner-header">
    <Link href="/">
        <img src={charli_banner.src} alt="Charli Banner" />
    </Link>
  </div>
);

export default BannerHeader;
