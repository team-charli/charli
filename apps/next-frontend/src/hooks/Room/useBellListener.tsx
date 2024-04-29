import { useEffect } from 'react';
import { useDataMessage } from '@huddle01/react/hooks';

const useBellListener = () => {
  const { sendData } = useDataMessage({
    onMessage: (payload, /*from,*/ label) => {
      if (label === 'bell') {
        const data = JSON.parse(payload);
        if (data.action === 'ringBell') {
          const audio = new Audio('/path/to/bell-sound.mp3');
          audio.play().catch(console.error);
        }
      }
    }
  });

  useEffect(() => {
    // You might want to handle any effects that depend on the sendData function here
  }, [sendData]);
};

export default useBellListener;
