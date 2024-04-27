import { useEffect } from 'react';
import { useStopwatch } from 'react-timer-hook';

type StopWatchProps = {}

const StopWatch = (props: StopWatchProps) => {
const {
    totalSeconds,
    seconds,
    minutes,
    hours,
    days,
    isRunning,
    start,
    pause,
    reset,
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
