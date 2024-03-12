import { useEffect } from 'react';
import { useDataMessage } from '@huddle01/react/hooks';

const useBellListener = () => {
  useEffect(() => {
     useDataMessage({
      onMessage: (payload: string, from: string, label?: string) => {
        if (label === 'bell') {
          const data = JSON.parse(payload);
          if (data.action === 'ringBell') {
            // Logic to play bell sound locally
            const audio = new Audio('/path/to/bell-sound.mp3');
            audio.play();
          }
        }
      },
    });
  }, []);
};

export default useBellListener;
