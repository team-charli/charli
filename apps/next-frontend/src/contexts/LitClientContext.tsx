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

interface LitClientProviderProps {
  children: ReactNode;
}

export const LitClientProvider = ({ children }: LitClientProviderProps) => {
  const [litNodeClientReady, setLitNodeClientReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log("LitClientProvider effect running");
    const connectClient = async () => {
      console.log("Attempting to connect LitNodeClient");
      try {
        const connectPromise = litNodeClient.connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 10000) // 10 second timeout
        );
        await Promise.race([connectPromise, timeoutPromise]);
        console.log("LitNodeClient connected successfully");
        setLitNodeClientReady(true);
      } catch (error) {
        console.error("Error connecting LitNodeClient:", error);
        setError(error as Error);
      }
    };
    connectClient();
    return () => {
      console.log("LitClientProvider cleanup running");
      const disconnectClient = async () => {
        try {
          await litNodeClient.disconnect();
          console.log('LitNodeClient disconnected');
          setLitNodeClientReady(false);
        } catch (e) {
          console.error("Error disconnecting LitNodeClient:", e);
        }
      };
      disconnectClient();
    };
  }, []);

  console.log("LitClientProvider rendering, litNodeClientReady:", litNodeClientReady);

  if (error) {
    return <div>Error initializing Lit client: {error.message}</div>;
  }

  return (
    <LitClientContext.Provider value={{ litNodeClientReady }}>
      {children}
    </LitClientContext.Provider>
  );
};
