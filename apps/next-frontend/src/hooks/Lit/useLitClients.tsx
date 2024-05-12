// useLitClients.ts
import { LitAuthClient } from '@lit-protocol/lit-auth-client';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { useEffect } from 'react';

const useLitClients = (litNodeClient: LitNodeClient, litAuthClient: LitAuthClient) => {
  useEffect(() => {
      const connectClients = async () => {
        await litNodeClient.connect().catch(error => {console.error(error); throw new Error('error litNodeClient.connect error')});
    };
    void (async () => {
      await connectClients().catch(error => {console.error(error); throw new Error('error connectClients()')});
    })();
    return () => {
      void (async () => {
        await litNodeClient.disconnect().catch(error => {console.error(error); throw new Error('error disconnect()')});
      })();
    };
  }, [litNodeClient]);
  return { litNodeClient, litAuthClient };
};

export default useLitClients;
