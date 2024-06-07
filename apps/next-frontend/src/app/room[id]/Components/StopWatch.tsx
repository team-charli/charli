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
  })
  return (
    <div className="__Stopwatch-Display__">
      {hours}:{minutes}:{seconds}
  </div>
  )
}

export default StopWatch
