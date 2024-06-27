import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils';

export const userIdAtom = atom<string | null>(null);

export const userNameAtom = atom<string>('')

export const isOnboardedAtom = atom<boolean>(false)

export const onboardModeAtom = atomWithStorage<'Learn' | 'Teach' | null>('onboardMode', null);




// export const onboardTeachingLangs
