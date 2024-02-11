import React, { createContext, useContext, useState } from 'react';
import useHasInternet from '../hooks/utils/useHasInternet';
import { NetworkContextType, NetworkProviderProps } from '../types/types';

const NetworkContext = createContext<NetworkContextType>({
  isOnline: false,
  preventRequests: false,
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<NetworkProviderProps>  = ({ children }) => {
  const isOnline = useHasInternet();
  const [preventRequests, setPreventRequests] = useState<boolean>(false);

  // Logic to toggle preventing requests
  // This could be adjusted depending on how you want to use isOnline status
  React.useEffect(() => {
    if (!isOnline) {
      setPreventRequests(true);
    } else {
      setPreventRequests(false);
    }
  }, [isOnline]);

  return (
    <NetworkContext.Provider value={{ isOnline, preventRequests }}>
      {children}
    </NetworkContext.Provider>
  );
};

