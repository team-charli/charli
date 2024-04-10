import { useState, useEffect } from 'react';

export const useThreeMinTimer = () => {
  const [threeMinElapsed, setThreeMinElapsed] = useState(() => {
    const storedStartTime = localStorage.getItem('timerStartTime');
    if (storedStartTime) {
      const elapsedTime = Date.now() - parseInt(storedStartTime, 10);
      return elapsedTime >= 180000; // 180000 ms = 3 minutes
    }
    return false;
  });

  const startTimer = () => {
    const startTime = Date.now();
    localStorage.setItem('timerStartTime', startTime.toString());
    setThreeMinElapsed(false);

    const timerId = setTimeout(() => {
      setThreeMinElapsed(true);
      localStorage.removeItem('timerStartTime');
    }, 180000);

    return () => clearTimeout(timerId);
  };

  useEffect(() => {
    const storedStartTime = localStorage.getItem('timerStartTime');
    if (storedStartTime) {
      const elapsedTime = Date.now() - parseInt(storedStartTime, 10);
      if (elapsedTime < 180000) {
        const timerId = setTimeout(() => {
          setThreeMinElapsed(true);
          localStorage.removeItem('timerStartTime');
        }, 180000 - elapsedTime);
        return () => clearTimeout(timerId);
      } else {
        setThreeMinElapsed(true);
        localStorage.removeItem('timerStartTime');
      }
    }
  }, []);

  return { threeMinElapsed, startTimer };
};

export default useThreeMinTimer;
