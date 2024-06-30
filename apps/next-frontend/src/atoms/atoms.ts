// atoms.ts
import { atom } from 'jotai';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { SupabaseClient } from '@supabase/supabase-js';

export const renderLoginButtonsAtom = atom<boolean>(false);
export const selectedLangAtom = atom<string>('');
export const nativeLangAtom = atom<string>('');
export const authMethodAtom = atom<AuthMethod | null | undefined>(null);
export const litAccountAtom = atom<IRelayPKP | null | undefined>(null);
export const sessionSigsAtom = atom<SessionSigs | null | undefined>(null);
export const litNodeClientReadyAtom = atom<boolean>(false);
export const isOAuthRedirectAtom = atom<boolean>(false);
export const isOnboardedAtom = atom<boolean>(false);
export const isLitLoggedInAtom = atom<boolean>(false);
export const onboardModeAtom = atom<'Teach' | 'Learn' | null>(null);
export const pkpWalletAtom = atom<PKPEthersWallet | null>(null);
export const nonceAtom = atom<string | null>(null);
export const signatureAtom = atom<string | null>(null);
export const supabaseClientAtom = atom<SupabaseClient | null>(null);
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

export const isLoadingAtom = atom((get) =>
  get(authLoadingAtom) ||
  get(accountsLoadingAtom) ||
  get(sessionSigsLoadingAtom) ||
  get(litNodeClientReadyLoadingAtom)
);
