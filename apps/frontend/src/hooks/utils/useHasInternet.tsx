import { useEffect, useState, useCallback } from 'react';
import isOnline from 'is-online';
import useLocalStorage from '@rehooks/local-storage';

const POLLING_INTERVAL = 30000 * 2 * 2; // Polling interval in milliseconds (e.g., 30000 ms = 30 seconds)

function useHasInternet(key = 'internetStatus', pollingInterval = POLLING_INTERVAL) {
  // Use useLocalStorage hook to get/set the internet status
  const [hasInternet, setHasInternet] = useLocalStorage(key, false);

  // Function to check online status and update local storage
  const checkOnlineStatusAndUpdate = useCallback(async () => {
    const onlineStatus = await isOnline();
    setHasInternet(onlineStatus);
  }, [setHasInternet]);

  useEffect(() => {
    // Immediate check on mount or key change
    checkOnlineStatusAndUpdate();

    // Set up periodic polling
    const intervalId = setInterval(() => {
      checkOnlineStatusAndUpdate();
    }, pollingInterval);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [checkOnlineStatusAndUpdate, pollingInterval]);

  return hasInternet;
}

export default useHasInternet;
