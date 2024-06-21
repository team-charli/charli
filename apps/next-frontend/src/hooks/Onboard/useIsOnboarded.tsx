import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { useEffect } from 'react';
import { supabaseClientAtom } from '@/atoms/atoms';
import { useRecoilValue } from 'recoil';
import { litNodeClient } from '@/utils/litClients';

export const useIsOnboarded = (isLitLoggedIn: boolean | null) => {
  const [isOnboarded, setIsOnboarded] = useLocalStorage<boolean>('isOnboarded', false);

  const supabaseClient = useRecoilValue(supabaseClientAtom);

  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');

  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userID, setUserID] = useLocalStorage("userID")
  useEffect(() => {
    if (isLitLoggedIn && currentAccount && sessionSigs && supabaseClient) {
      (async () => {
        console.log('Conditions met, checking onboarding status');
        try {
          const { data, error } = await supabaseClient
            .from("user_data")
            .select("id, user_address")
            .eq("user_address", currentAccount?.ethAddress)
            .single();
          console.log('Supabase query result', { data, error });

          if (error || !data) {
            console.log('set isOnboarded: false');
            setIsOnboarded(false);
          } else {
            console.log('set isOnboarded: true');
            setUserID(data.id);
            setIsOnboarded(true);
          }
        } catch(e) {
          console.error('API call to user_address failed', e);
        }
      })();
    } else {
      console.log('Conditions not met for checking onboarding status', {isLitLoggedIn, currentAccount: Boolean(currentAccount),sessionSigs: Boolean(sessionSigs), supabaseClient: Boolean(supabaseClient)});
    }
  }, [supabaseClient, isLitLoggedIn, currentAccount, sessionSigs]);
  return {isOnboarded, setIsOnboarded};
}

