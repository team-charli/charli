import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { useEffect } from 'react';
import { supabaseClientAtom } from '@/atoms/atoms';
import { useRecoilValue } from 'recoil';
import { useLitClientReady } from '@/contexts/LitClientContext';

export const useIsOnboarded = (isLitLoggedIn: boolean | null) => {
  const [isOnboarded, setIsOnboarded] = useLocalStorage<boolean>('isOnboarded', false);
  const supabaseClient = useRecoilValue(supabaseClientAtom);
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userID, setUserID] = useLocalStorage("userID")
  const { litNodeClientReady } = useLitClientReady();

  useEffect(() => {
    console.log({isLitLoggedIn: isLitLoggedIn!!, currentAccount: currentAccount!!, sessionSigs: sessionSigs!!, supabaseClient:supabaseClient!!, litNodeClientReady: litNodeClientReady!!})
  }, [isLitLoggedIn, currentAccount, sessionSigs, supabaseClient, litNodeClientReady])

  useEffect(() => {
    if (isLitLoggedIn && currentAccount && sessionSigs && supabaseClient && litNodeClientReady) {
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
    }
  }, [supabaseClient, isLitLoggedIn, currentAccount, sessionSigs, litNodeClientReady ]);
  return {isOnboarded, setIsOnboarded};
}

