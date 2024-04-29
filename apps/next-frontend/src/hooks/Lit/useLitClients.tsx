// useLitClients.ts
import { LitAuthClient } from '@lit-protocol/lit-auth-client';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { useEffect } from 'react';

const useLitClients = (litNodeClient: LitNodeClient, litAuthClient: LitAuthClient) => {
  useEffect(() => {
    const connectClients = async () => {
      await litNodeClient.connect();
    };
    void (async () => {
      await connectClients();
    })();
    return () => {
      void (async () => {
        await litNodeClient.disconnect();
      })();
    };
  }, [litNodeClient]);
  return { litNodeClient, litAuthClient };
};

export default useLitClients;
