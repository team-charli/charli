import { useState, useEffect } from 'react';

export const use90SecondTimer = () => {
  const [ninetySecondsElapsed, setNinetySecondsElapsed] = useState(() => {
    const storedStartTime = localStorage.getItem('ninetySecTimerStartTime');
    if (storedStartTime) {
      const elapsedTime = Date.now() - parseInt(storedStartTime, 10);
      return elapsedTime >= 90000; // 90000 ms = 3 minutes
    }
    return false;
  });

  const start90SecTimer = () => {
    const startTime = Date.now();
    localStorage.setItem('ninetySecTimerStartTime', startTime.toString());
    setNinetySecondsElapsed(false);

    const timerId = setTimeout(() => {
      setNinetySecondsElapsed(true);
      localStorage.removeItem('ninetySecTimerStartTime');
    }, 90000);

    return () => clearTimeout(timerId);
  };

  useEffect(() => {
    const storedStartTime = localStorage.getItem('ninetySecTimerStartTime');
    if (storedStartTime) {
      const elapsedTime = Date.now() - parseInt(storedStartTime, 10);
      if (elapsedTime < 90000) {
        const timerId = setTimeout(() => {
          setNinetySecondsElapsed(true);
          localStorage.removeItem('ninetySecTimerStartTime');
        }, 90000 - elapsedTime);
        return () => clearTimeout(timerId);
      } else {
        setNinetySecondsElapsed(true);
        localStorage.removeItem('ninetySecTimerStartTime');
      }
    }
  }, []);

  return { ninetySecondsElapsed, start90SecTimer };
};

export default use90SecondTimer;

