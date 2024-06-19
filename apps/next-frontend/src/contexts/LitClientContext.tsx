// // 'use client'
// LitClientProvider.tsx
import React, { ReactNode, useEffect } from 'react';
import {litNodeClient} from '@/utils/litClients'
interface LitClientProviderProps {
  children: ReactNode;
}

export const LitClientProvider = ({ children }: LitClientProviderProps) => {

  useEffect(() => {
    const connectClient = async () => {
      try {
        await litNodeClient.connect();
        console.log("LitNodeClient connected");
      } catch (error) {
        console.error("Error connecting LitNodeClient:", error);
      }
    };
    connectClient();
    const disconnectClient = async () => {
      try{
        await litNodeClient.disconnect();
        console.log('lit node client disconnected')
      } catch(e) {
        console.error(e);
      }
    }

    () => { disconnectClient(); }

  }, [litNodeClient]);

  return <>{children}</>;
};

