import {Link} from '@tanstack/react-router';

const MoneyBag = () => {
  return (
    <Link 
      href="/bolsa" 
      className="inline-block transform transition-transform duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 rounded-full p-1"
    >
      <div className="relative">
        <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">💰</p>
        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs sm:text-sm rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center">
          $
        </span>
      </div>
      <span className="sr-only">View Wallet</span>
    </Link>
  )
}

export default MoneyBag
