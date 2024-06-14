// useLitClients.ts
import { litAuthClient, litNodeClient } from '@/utils/litClients';
import { useEffect } from 'react';

const useLitClients = () => {
  useEffect(() => {
      const connectClients = async () => {
        await litNodeClient.connect().catch(error => {console.error(error); throw new Error('error litNodeClient.connect error')});
    };
    void (async () => {
      await connectClients();
    })();
    void (async () => {
      await connectClients().catch(error => {console.error(error); throw new Error('error connectClients()')});
    })();
    return () => {
      void (async () => {
        console.log('call disconnect -- useClients cleanup');

        await litNodeClient.disconnect().catch(error => {console.error(error); throw new Error('error disconnect()')});
      })();
    };
  }, [litNodeClient]);
};

export default useLitClients;
