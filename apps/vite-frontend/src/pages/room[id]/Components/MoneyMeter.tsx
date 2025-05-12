import { useEffect } from "react"


export default function MoneyMeter() {
  // Mocked values until implementation is complete
  const currentEarnings = 12.50;
  const ratePerMinute = 0.25;

  useEffect(() => {
    //TODO: implement
    //listen for lit money/ticks
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-3 md:p-4">
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
        <div className="flex items-center">
          <span className="text-xl sm:text-2xl md:text-3xl mr-1 sm:mr-2">💰</span>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-gray-500">Current Earnings</span>
            <span className="font-bold text-sm sm:text-base md:text-lg text-green-600">${currentEarnings.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="hidden sm:block text-gray-300 mx-2">|</div>
        
        <div className="flex items-center">
          <span className="text-xl sm:text-2xl md:text-3xl mr-1 sm:mr-2">⏱️</span>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-gray-500">Rate</span>
            <span className="font-medium text-sm sm:text-base text-gray-700">${ratePerMinute.toFixed(2)}/min</span>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 sm:mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-green-500 h-full rounded-full"
          style={{ width: '25%' }} // This would be dynamic in the real implementation
        ></div>
      </div>
    </div>
  );
}

