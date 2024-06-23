// hooks/useIsOnboarded.ts
import { useRecoilValue, useRecoilCallback, useSetRecoilState } from 'recoil';
import { isOnboardedSelector } from '@/selectors/isOnboardedSelector';
import { userIdAtom } from '@/atoms/userDataAtoms';
import { supabaseClientSelector } from '@/selectors/supabaseClientSelector';
import { currentAccountAtom } from '@/atoms/litAccountAtoms';
import { sessionSigsAtom } from '@/atoms/litSessionAtoms';
import { litNodeClientReadyAtom } from '@/atoms/atoms';

export function useIsOnboarded() {
  const isOnboarded = useRecoilValue(isOnboardedSelector);
  const setUserID = useSetRecoilState(userIdAtom);

  const initializeIsOnboarded = useRecoilCallback(({ snapshot }) => async () => {
    try {
      const supabaseClient = await snapshot.getPromise(supabaseClientSelector);
      const currentAccount = await snapshot.getPromise(currentAccountAtom);
      const sessionSigs = await snapshot.getPromise(sessionSigsAtom);
      const litNodeClientReady = await snapshot.getPromise(litNodeClientReadyAtom);

      if (!supabaseClient || !currentAccount || !sessionSigs || !litNodeClientReady) {
        console.log('Dependencies not ready for onboarding check');
        return false;
      }

      const onboardedStatus = await snapshot.getPromise(isOnboardedSelector);

      if (onboardedStatus) {
        const { data } = await supabaseClient
          .from("user_data")
          .select("id")
          .eq("user_address", currentAccount.ethAddress)
          .single();

        if (data) {
          setUserID(data.id);
        }
      }

      console.log('Onboarding status checked:', onboardedStatus);
      return onboardedStatus;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }, []);

  return { isOnboarded, initializeIsOnboarded };
}
