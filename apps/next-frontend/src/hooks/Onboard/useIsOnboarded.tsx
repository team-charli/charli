import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { useEffect } from 'react';
import { useSupabase } from '@/contexts';

export const useIsOnboarded = () => {
  const [isOnboarded, setIsOnboarded] = useLocalStorage<boolean>('isOnboarded', false);

  const {  getAuthenticatedClient, supabaseLoading } = useSupabase();

  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');

  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  const [ isLitLoggedIn ] = useLocalStorage("isLitLoggedIn");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userID, setUserID] = useLocalStorage("userID")
  useEffect( () => {
    void (async () => {
      const supabaseClient = await getAuthenticatedClient();
      if (isLitLoggedIn && currentAccount && sessionSigs && supabaseClient) {
        try {
          console.log('run isOnboarded');
          const { data, error } = await supabaseClient
            .from("user_data")
            .select("id, user_address")
            .eq("user_address", currentAccount?.ethAddress)
            .single();
            console.log('data', data)
          if (error || !data) {
            console.log('set isOnboarded: false')
            setIsOnboarded(false);
          } else if (!error && data) {
            console.log('set isOnboarded: true' )
            setUserID(data.id);
            setIsOnboarded(true);
          }
        } catch(e) {
          console.log('api call to user_address failed')
          throw new Error(`Error`)
        }
      }
    })();
  }, [getAuthenticatedClient,  isOnboarded, supabaseLoading, isLitLoggedIn, currentAccount, sessionSigs])
  return {isOnboarded, setIsOnboarded};
}

