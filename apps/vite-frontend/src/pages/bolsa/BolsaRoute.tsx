//UturnModal.tsx
import IconHeader from '@/components/headers/IconHeader';
import { useIsLitLoggedIn, useIsOnboarded } from '@/contexts/AuthContext';
import { redirect } from '@tanstack/react-router';
import UturnModal from '@/components/elements/UturnModal';


const BolsaRoute = () => {
  const { data: isOnboarded } = useIsOnboarded();
  const { data: isLitLoggedIn } = useIsLitLoggedIn();
  let modal
  if (isOnboarded && isLitLoggedIn) {
    modal = null;
  } else if (!isLitLoggedIn && isOnboarded) {
    modal = <UturnModal />
  } else if (isLitLoggedIn && !isOnboarded) {
    modal = null;
    console.log('push to /onboard');
    throw redirect({to:"/onboard" } )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full mb-4 sm:mb-6 md:mb-8">
        <IconHeader />
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 md:px-8">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
            Your Wallet
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-md mx-auto">
            Manage your earnings and transactions here
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 w-full max-w-sm sm:max-w-md md:max-w-lg border border-gray-100">
          <div className="flex flex-col items-center">
            <div className="bg-blue-50 p-4 sm:p-5 md:p-6 rounded-full mb-4 sm:mb-6">
              <p className="text-5xl sm:text-6xl md:text-7xl">🤵‍♀️</p>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-2 sm:mb-3">
              0.00 USDC
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mb-6">
              Your current balance
            </p>
            <div className="grid grid-cols-2 gap-4 w-full">
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm sm:text-base transition-colors">
                Deposit
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg text-sm sm:text-base transition-colors">
                Withdraw
              </button>
            </div>
          </div>
        </div>
        
        {modal}
      </div>
    </div>
  )
}

export default BolsaRoute


//TODO: Add Screen 3.2 (coin logos)


