// atoms.ts
import { atom } from 'jotai';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { atomWithStorage } from 'jotai/utils';

export const renderLoginButtonsAtom = atom<boolean>(false);
export const selectedLangAtom = atom<string>('');
export const nativeLangAtom = atom<string>('');

export const authMethodAtom = atomWithStorage<AuthMethod | null | undefined>('authMethod', null);
export const litAccountAtom = atomWithStorage<IRelayPKP | null | undefined>('litAccount', null);
export const sessionSigsAtom = atomWithStorage<SessionSigs | null | undefined>('sessionSigs', null);
export const litNodeClientReadyAtom = atom<boolean>(false);
export const isOAuthRedirectAtom = atom<boolean>(false);
export const isOnboardedAtom = atom<boolean>(false);
export const onboardModeAtom = atom<'Teach' | 'Learn' | null>(null);
export const pkpWalletAtom = atom<PKPEthersWallet | null>(null);
export const nonceAtom = atom<string | null>(null);
export const signatureAtom = atom<string | null>(null);
// export const supabaseClientAtom = atom<SupabaseClient | null>(null);
export const supabaseJWTAtom = atom<string | null>(null);
export const hasBalanceAtom = atom<boolean | null>(null);

export const authLoadingAtom = atom(false);
export const accountsLoadingAtom = atom(false);
export const sessionSigsLoadingAtom = atom(false);
export const litNodeClientReadyLoadingAtom = atom(false);

export const authErrorAtom = atom<Error | null>(null);
export const accountsErrorAtom = atom<Error | null>(null);
export const sessionSigsErrorAtom = atom<Error | null>(null);
export const litNodeClientReadyErrorAtom = atom<Error | null>(null);

export const isLoadingAtom = atom<boolean>(false);

export const isJwtExpiredAtom = atom<boolean>(false);
export const sessionSigsExpiredAtom = atom<boolean>(false);

export const isLitLoggedInAtom = atom((get) => {
  const jwtExpired = get(isJwtExpiredAtom );
  const sessionSigsExpired = get(sessionSigsExpiredAtom);
  const sessionSigs = get(sessionSigsAtom);
  const litAccount = get(litAccountAtom);

  return !jwtExpired && !sessionSigsExpired && !!sessionSigs && !!litAccount;
});


