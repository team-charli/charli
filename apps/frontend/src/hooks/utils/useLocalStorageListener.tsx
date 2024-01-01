// useLocalStorageListener.js
import { useEffect } from 'react';

export const useLocalStorageListener = (key: string, callback: Function) => {
  useEffect(() => {
    const handleStorageChange = () => {
      callback(localStorage.getItem(key));
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, callback]);
};

