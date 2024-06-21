import React, { ReactNode, useEffect, useState, createContext, useContext } from 'react';
import { litNodeClient } from '@/utils/litClients'

interface LitClientContextType {
  litNodeClientReady: boolean;
}

const LitClientContext = createContext<LitClientContextType>({ litNodeClientReady: false });

export const useLitClientReady = () => useContext(LitClientContext);

interface LitClientProviderProps {
  children: ReactNode;
}

export const LitClientProvider = ({ children }: LitClientProviderProps) => {
  const [litNodeClientReady, setLitNodeClientReady] = useState(false);

  useEffect(() => {
    const connectClient = async () => {
      try {
        await litNodeClient.connect();
        console.log("LitNodeClient connected");
        setLitNodeClientReady(true);
      } catch (error) {
        console.error("Error connecting LitNodeClient:", error);
      }
    };
    connectClient();

    return () => {
      const disconnectClient = async () => {
        try {
          await litNodeClient.disconnect();
          console.log('lit node client disconnected');
          setLitNodeClientReady(false);
        } catch (e) {
          console.error(e);
        }
      };
      disconnectClient();
    };
  }, []);

  return (
    <LitClientContext.Provider value={{ litNodeClientReady }}>
      {children}
    </LitClientContext.Provider>
  );
};
