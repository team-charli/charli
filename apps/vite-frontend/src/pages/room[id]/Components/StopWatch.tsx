import { useEffect } from 'react';
import { useStopwatch } from 'react-timer-hook';

const StopWatch = () => {
const {
    seconds,
    minutes,
    hours,
    // totalSeconds,
    // days,
    // isRunning,
    // start,
    // pause,
    // reset,
  } = useStopwatch({ autoStart: false });

  useEffect(() => {
    //TODO: implement
    // listen for Lit Action StartRoom
  }, []);
  
  // Format the time values to always show two digits
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-3 sm:px-4 md:px-6 py-2 sm:py-3">
      <div className="flex flex-col items-center">
        <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
          Session Time
        </div>
        <div className="font-mono font-bold text-xl sm:text-2xl md:text-3xl text-gray-800">
          {formattedHours}:{formattedMinutes}:{formattedSeconds}
        </div>
      </div>
    </div>
  )
}

export default StopWatch
