import { Link } from '@tanstack/react-router';
import charli_banner from '../../assets/charli_banner.png';

const BannerHeader = () => (
  <div className="flex flex-col items-center w-full px-2 sm:px-4 md:px-6 lg:px-8">
    <Link 
      href="/" 
      className="block transform transition duration-300 hover:scale-102 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 rounded-lg overflow-hidden"
    >
      <img
        className="w-full max-w-[200px] sm:max-w-[250px] md:max-w-[300px] lg:max-w-[350px] h-auto object-contain"
        src={charli_banner}
        alt="Charli Banner"
      />
    </Link>
    <div className="mt-2 sm:mt-3 md:mt-4 text-center">
      <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-800 hidden sm:block">
        Connect • Learn • Grow
      </h2>
      <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 hidden md:block">
        Your language learning companion
      </p>
    </div>
  </div>
);

export default BannerHeader;
