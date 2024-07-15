// atoms.ts
import { atom } from 'jotai';
import { AuthMethod, AuthSig, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { atomWithStorage } from 'jotai/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { clone, cloneDeep } from 'lodash';
import { sessionSigsExpired } from '@/utils/app';

export const renderLoginButtonsAtom = atom<boolean>(false);
export const selectedLangAtom = atom<string>('');
export const nativeLangAtom = atom<string>('');

export const authMethodAtom = atomWithStorage<AuthMethod | null | undefined>('authMethod', null);
export const litAccountAtom = atomWithStorage<IRelayPKP | null | undefined>('litAccount', null);
export const sessionSigsAtom = atomWithStorage<SessionSigs | null | undefined>('sessionSigs', null);
export const authSigAtom = atomWithStorage<AuthSig | null | undefined>('lit-wallet-sig', null)
export const isOAuthRedirectAtom = atom<boolean>(false);
export const isOnboardedAtom = atom<boolean>(false);
export const onboardModeAtom = atom<'Teach' | 'Learn' | null>(null);
export const pkpWalletAtom = atom<PKPEthersWallet | null>(null);
// export const nonceAtom = atom<string | null>(null);
export const signatureAtom = atom<string | null>(null);
export const supabaseJWTAtom = atomWithStorage<string | null>('supabaseJWT', null);

export const hasBalanceAtom = atom<boolean | null>(null);

export const authLoadingAtom = atom(false);
export const accountsLoadingAtom = atom(false);
export const sessionSigsLoadingAtom = atom(false);

export const authErrorAtom = atom<Error | null>(null);
export const accountsErrorAtom = atom<Error | null>(null);
export const sessionSigsErrorAtom = atom<Error | null>(null);

export const isLoadingAtom = atom<boolean>(false);

export const authSigExpiredAtom = atom<boolean>(false);
export const isLitLoggedInAtom = atom((get) => {
  const sessionSigs = get(sessionSigsAtom);
  const litAccount = get(litAccountAtom);

  if (!sessionSigs || !litAccount) {
    return false;
  }

  return !sessionSigsExpired(sessionSigs);
});

export const userIdAtom = atom<string | null>(null);

export const userNameAtom = atom<string>('')



