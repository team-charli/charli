import { atom, DefaultValue } from 'recoil';
import { supabaseClientSelector } from '@/selectors';
import { currentAccountAtom } from './litAccountAtoms';

export const userIdAtom = atom<string | null>({
  key: 'userIdAtom',
  default: null,
});

export const userNameAtom = atom<string> ({
  key: 'userName',
  default: ''
})

export const isOnboardedAtom = atom<boolean>({
  key: 'isOnboareded',
  default: false
})

export const onboardModeAtom = atom<'Learn' | 'Teach' | null>({
  key: 'onboardMode',
  default: null
})

export const onboardStatusAtom = atom<{ isOnboarded: boolean; userId: string | null }>({
  key: 'onboardStatusAtom',
  default: { isOnboarded: false, userId: null },
  effects: [
    ({ setSelf, trigger, onSet, getPromise }) => {
      const fetchOnboardStatus = async () => {
        const supabaseClient = await getPromise(supabaseClientSelector);
        const currentAccount = await getPromise(currentAccountAtom);
        if (!supabaseClient) {
          setSelf({ isOnboarded: false, userId: null });
          return;
        }

        try {
          const { data, error } = await supabaseClient
            .from("user_data")
            .select("id, user_address")
            .eq("user_address", currentAccount?.ethAddress)

            .single();

          if (error || !data) {
            setSelf({ isOnboarded: false, userId: null });
          } else {
            setSelf({ isOnboarded: true, userId: data.id });
          }
        } catch (e) {
          console.error('API call to user_data failed', e);
          setSelf({ isOnboarded: false, userId: null });
        }
      };

      if (trigger === 'get') {
        fetchOnboardStatus();
      }

      onSet((newValue) => {
        if (!(newValue instanceof DefaultValue)) {
          setSelf(newValue);
        }
      });
    },
  ],
});


export const nativeLangAtom = atom<string>({
  key: 'nativeLang',
  default: ''
})
