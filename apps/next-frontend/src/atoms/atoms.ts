// atoms.ts
import { atom, selector } from 'recoil';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import {litNodeClient} from '../utils/litClients'
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { isJwtExpired } from '../utils/app';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_API_KEY!;

export const litNodeClientAtom = atom<LitNodeClient>({
  key: 'litNodeClient',
  default: litNodeClient,
});

export const pkpWalletAtom = atom<PKPEthersWallet | null>({
  key: 'pkpWallet',
  default: null,
});

export const userJWTAtom = atom<string | null>({
  key: 'userJWT',
  default: null,
});

export const supabaseClientAtom = selector<SupabaseClient | null>({
  key: 'supabaseClient',
  get: ({ get }) => {
    const userJWT = get(userJWTAtom);
    if (userJWT && !isJwtExpired(userJWT)) {
      return createClient(supabaseUrl!, supabaseAnonKey!, {
        global: { headers: { Authorization: `Bearer ${userJWT}` } },
      });
    }
    return null;
  },
});

export const currentAccountAtom = atom<IRelayPKP | null>({
  key: 'currentAccount',
  default: null,
});

export const sessionSigsAtom = atom<SessionSigs | null>({
  key: 'sessionSigs',
  default: null,
});


